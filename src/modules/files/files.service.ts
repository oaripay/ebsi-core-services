import crypto from "crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BadRequestError } from "@cef-ebsi/problem-details-errors";
import { PostFileResponseObject } from "./files.interface";
import { AppUsageRepository, FilesRepository } from "../cassandra/repositories";
import {
  ExcessiveAppUsageError,
  ValueTooLargeError,
} from "../../shared/errors";
import { ApiConfig } from "../../config/configuration";
import { PostFileBody } from "./dto";
import { byteLength } from "../../shared/utils";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_METADATA_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_APP_USAGE = 1024 * 1024 * 1024; // 1GB

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private configService: ConfigService<ApiConfig>,
    private filesRepository: FilesRepository,
    private appUsageRepository: AppUsageRepository
  ) {}

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

    const metadata = body.metadata.value || "{}";

    const metadataByteLength = byteLength(metadata);

    if (metadataByteLength > MAX_METADATA_SIZE) {
      throw new ValueTooLargeError(
        `Max size for 'metadata' is ${MAX_METADATA_SIZE} bytes. Received ${metadataByteLength}`
      );
    }

    try {
      JSON.parse(metadata);
    } catch (e) {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: "Invalid metadata. It must be a stringified JSON document.",
      });
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
        metadata,
      }),
      this.appUsageRepository.setAppUsage(
        { did, numberBytes: `${didAppUsageInBytes}` },
        isNewAppUsage
      ),
    ]);

    return { hash, function: "sha3-256" };
  }
}

export default FilesService;
