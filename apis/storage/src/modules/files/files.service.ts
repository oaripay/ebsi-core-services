import crypto from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { types } from "cassandra-driver";
import jsonpatch, { Operation } from "fast-json-patch";
import {
  ExcessiveAppUsageError,
  ValueTooLargeError,
  BadRequestError,
  NotFoundError,
  InternalServerError,
  byteLength,
  decrypt,
  encrypt,
} from "@ebsiint-api/shared";
import { PostFileResponseObject, FileMetadata } from "./files.interface";
import { AppUsageRepository, FilesRepository } from "../cassandra/repositories";
import { CASSANDRA_EXCEPTIONS } from "../cassandra/cassandra.constants";
import { FileModel } from "../cassandra/models";
import { ApiConfig } from "../../config/configuration";
import { PatchFileBody, PostFileBody } from "./dto";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_METADATA_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_APP_USAGE = 1024 * 1024 * 1024; // 1GB

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private configService: ConfigService<ApiConfig, true>,
    private filesRepository: FilesRepository,
    private appUsageRepository: AppUsageRepository
  ) {}

  async getFiles(
    did: string,
    requestedPageState: string,
    pageSize: number
  ): Promise<{ hashes: string[]; pageState: string }> {
    // Note: The page state token can be manipulated to retrieve other results within the same
    // column family, so it is not safe to expose it to the users in plain text.
    // https://docs.datastax.com/en/developer/nodejs-driver/4.6/features/paging/
    let decryptedPageState = "";
    if (requestedPageState) {
      try {
        // Decrypt pageState
        decryptedPageState = decrypt(
          requestedPageState,
          this.configService.get("encryptionSecret")
        );
      } catch (e) {
        this.logger.error((e as Error).message, (e as Error).stack);
        throw new BadRequestError(BadRequestError.defaultTitle, {
          detail: "Invalid page[after] parameter",
        });
      }
    }

    let result: types.ResultSet;

    try {
      result = await this.filesRepository.getFiles(
        did,
        decryptedPageState,
        pageSize
      );
    } catch (e) {
      if (
        e instanceof Error &&
        e.message.includes(CASSANDRA_EXCEPTIONS.PAGE_STATE_ERROR)
      ) {
        throw new BadRequestError(BadRequestError.defaultTitle, {
          detail: "Invalid page[after] parameter",
        });
      }
      throw e;
    }

    const { pageState: rawPageState, rows } = result;

    const items = rows.map((r): string => (r as unknown as FileModel).hash);

    let encryptedPageState = "";
    if (rawPageState) {
      // Encrypt page state
      encryptedPageState = encrypt(
        rawPageState,
        this.configService.get("encryptionSecret")
      );
    }

    return { hashes: items, pageState: encryptedPageState };
  }

  async getFile({
    did,
    hash,
  }: {
    did: string;
    hash: string;
  }): Promise<{ filename: string; mimetype: string; data: Buffer }> {
    const file = await this.filesRepository.getFile({ did, hash });

    if (!file) {
      throw new NotFoundError(NotFoundError.defaultTitle, {
        detail: "File not found",
      });
    }

    const parsedMetadata = JSON.parse(file.metadata) as FileMetadata;

    return {
      filename: parsedMetadata.filename,
      mimetype: parsedMetadata.mimetype,
      data: file.data,
    };
  }

  async getFileMetadata({
    did,
    hash,
  }: {
    did: string;
    hash: string;
  }): Promise<FileMetadata> {
    const file = await this.filesRepository.getFile({ did, hash });

    if (!file) {
      throw new NotFoundError(NotFoundError.defaultTitle, {
        detail: "File not found",
      });
    }

    try {
      return JSON.parse(file.metadata) as FileMetadata;
    } catch (e) {
      this.logger.error(
        `Unable to parse metadata of file [${did}, ${hash}].\nMetadata: ${
          file.metadata
        }\n${(e as Error).message}.`,
        (e as Error).stack
      );
      throw new InternalServerError(InternalServerError.defaultTitle, {
        detail:
          "There was an error while parsing the requested file's metadata.",
      });
    }
  }

  async postFile(
    did: string,
    body: PostFileBody
  ): Promise<PostFileResponseObject> {
    if (!body.file) {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: "'file' is missing",
      });
    }

    if (!body.metadata) {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: "'metadata' is missing",
      });
    }

    // Accumulate whole file in memory
    const file = await body.file.toBuffer();
    const fileByteLength = byteLength(file);

    if (fileByteLength > MAX_FILE_SIZE) {
      throw new ValueTooLargeError(
        `Max size for 'file' is ${MAX_FILE_SIZE} bytes. Received ${fileByteLength}`
      );
    }

    const inputMetadata = body.metadata.value || "{}";

    let parsedMetadata: FileMetadata = {};
    try {
      parsedMetadata = JSON.parse(inputMetadata) as FileMetadata;
    } catch (e) {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: "Invalid metadata. It must be a stringified JSON document.",
      });
    }

    // Fill metadata with filename and mimetype (if available)
    if (!parsedMetadata.filename && body.file.filename) {
      parsedMetadata.filename = body.file.filename;
    }

    if (!parsedMetadata.mimetype && body.file.mimetype) {
      parsedMetadata.mimetype = body.file.mimetype;
    }

    const finalMetadata = JSON.stringify(parsedMetadata);

    const metadataByteLength = byteLength(finalMetadata);

    if (metadataByteLength > MAX_METADATA_SIZE) {
      throw new ValueTooLargeError(
        `Max size for 'metadata' is ${MAX_METADATA_SIZE} bytes. Received ${metadataByteLength}`
      );
    }

    // Compute SHA3-256 hash of the file data
    const hash = `0x${crypto
      .createHash("sha3-256")
      .update(file)
      .digest()
      .toString("hex")}`;

    // Check if it has already been stored
    const record = await this.filesRepository.getFile({ did, hash });

    if (record) {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: `This file is already stored (hash: ${record.hash})`,
      });
    }

    const currentAppUsage = await this.appUsageRepository.getAppUsage(did);
    const isNewAppUsage = currentAppUsage === null;

    const didAppUsageInBytes = isNewAppUsage
      ? fileByteLength + metadataByteLength
      : parseInt(currentAppUsage.numberBytes, 10) +
        fileByteLength +
        metadataByteLength;

    if (didAppUsageInBytes >= MAX_APP_USAGE) {
      throw new ExcessiveAppUsageError("App exceeds the allowed space of 1GB");
    }

    // Store file
    await Promise.all([
      this.filesRepository.insertFile({
        did,
        hash,
        data: file,
        metadata: finalMetadata,
      }),
      this.appUsageRepository.setAppUsage(
        { did, numberBytes: `${didAppUsageInBytes}` },
        isNewAppUsage
      ),
    ]);

    return { hash, function: "sha3-256" };
  }

  async patchFile(
    {
      did,
      hash,
    }: {
      did: string;
      hash: string;
    },
    patch: PatchFileBody[]
  ): Promise<FileMetadata> {
    const file = await this.filesRepository.getFile({ did, hash });

    if (!file) {
      throw new NotFoundError(NotFoundError.defaultTitle, {
        detail: "File not found",
      });
    }

    const existingMetadata = {
      metadata: {
        ...JSON.parse(file.metadata),
      } as FileMetadata,
    };

    const patchErrors = jsonpatch.validate(
      patch as Operation[],
      existingMetadata
    );

    if (patchErrors) {
      this.logger.error(patchErrors, patchErrors.stack);
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: "patch operation is not valid",
      });
    }

    const newMetadata = jsonpatch.applyPatch(
      existingMetadata,
      patch as Operation[],
      false,
      false
    ).newDocument.metadata;

    const stringifiedNewMetadata = JSON.stringify(newMetadata);

    const currentAppUsage = await this.appUsageRepository.getAppUsage(did);
    if (currentAppUsage === null) {
      this.logger.error(
        "Tried to patch a file's metadata, but couldn't find existing app usage"
      );
      throw new InternalServerError(InternalServerError.defaultTitle, {
        detail: "File not found",
      });
    }

    const byteDiff =
      byteLength(stringifiedNewMetadata) - byteLength(file.metadata);
    const didAppUsageInBytes =
      parseInt(currentAppUsage.numberBytes, 10) + byteDiff;

    if (didAppUsageInBytes >= MAX_APP_USAGE) {
      throw new ExcessiveAppUsageError("App exceeds the allowed space of 1GB");
    }

    // Store file
    await Promise.all([
      this.filesRepository.updateFileMetadata({
        ...file,
        metadata: stringifiedNewMetadata,
      }),
      this.appUsageRepository.setAppUsage(
        { did, numberBytes: `${didAppUsageInBytes}` },
        false
      ),
    ]);

    return newMetadata;
  }

  async deleteFile({
    did,
    hash,
  }: {
    did: string;
    hash: string;
  }): Promise<void> {
    const file = await this.filesRepository.getFile({ did, hash });

    if (!file) {
      throw new NotFoundError(NotFoundError.defaultTitle, {
        detail: "File not found",
      });
    }

    const currentAppUsage = await this.appUsageRepository.getAppUsage(did);
    const isNewAppUsage = currentAppUsage === null;
    const didAppUsageInBytes = isNewAppUsage
      ? 0
      : Math.max(
          0,
          parseInt(currentAppUsage.numberBytes, 10) -
            byteLength(file.data) -
            byteLength(file.metadata)
        );

    await Promise.all([
      this.filesRepository.deleteFile({ did, hash }),
      this.appUsageRepository.setAppUsage(
        { did, numberBytes: `${didAppUsageInBytes}` },
        isNewAppUsage
      ),
    ]);
  }
}

export default FilesService;
