import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  BadRequestError,
  NotFoundError,
} from "@cef-ebsi/problem-details-errors";
import { types } from "cassandra-driver";
import { KeyValuesRepository, PAGE_STATE_ERROR } from "./key-values.repository";
import { KeyValueModel } from "./models/key-value.model";
import { AppUsageRepository } from "./app-usage.repository";
import { PutKeyValuesResponseObject } from "./key-values.interface";
import { ValueTooLargeError, ExcessiveAppUsageError } from "./errors";
import { ApiConfig } from "../../config/configuration";
import { lengthInBytes, encrypt, decrypt } from "../../shared/utils";

const MAX_SIZE_VALUE = 5 * 1024 * 1024; // 5 MB
const MAX_APP_USAGE = 1024 * 1024 * 1024; // 1GB

@Injectable()
export class KeyValuesService {
  private readonly logger = new Logger(KeyValuesService.name);

  constructor(
    private configService: ConfigService<ApiConfig>,
    private keyValuesRepository: KeyValuesRepository,
    private appUsageRepository: AppUsageRepository
  ) {}

  async getKeys(
    did: string,
    requestedPageState: string,
    pageSize: number
  ): Promise<{ keys: string[]; pageState: string }> {
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
      result = await this.keyValuesRepository.getKeyValues(
        did,
        decryptedPageState,
        pageSize
      );
    } catch (e) {
      if (e instanceof Error && e.message.includes(PAGE_STATE_ERROR)) {
        throw new BadRequestError(BadRequestError.defaultTitle, {
          detail: "Invalid page[after] parameter",
        });
      }
      throw e;
    }

    const { pageState: rawPageState, rows } = result;

    const items = rows.map(
      (r): string => ((r as unknown) as KeyValueModel).key
    );

    let encryptedPageState = "";
    if (rawPageState) {
      // Encrypt page state
      encryptedPageState = encrypt(
        rawPageState,
        this.configService.get("encryptionSecret")
      );
    }

    return { keys: items, pageState: encryptedPageState };
  }

  async getKeyValue({
    did,
    key,
  }: {
    did: string;
    key: string;
  }): Promise<string> {
    const keyValue = await this.keyValuesRepository.getKeyValue({ did, key });

    if (!keyValue) {
      throw new NotFoundError(NotFoundError.defaultTitle, {
        detail: "Key not found",
      });
    }

    return keyValue.value;
  }

  async putKeyValue(
    did: string,
    key: string,
    value: unknown
  ): Promise<{ keyValue: PutKeyValuesResponseObject; isNew: boolean }> {
    if (typeof value !== "string") {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: "Invalid value provided. Only strings are accepted.",
      });
    }

    const keyValue = {
      did,
      key,
      value,
    };

    const bytesLength = lengthInBytes(value);

    if (bytesLength > MAX_SIZE_VALUE) {
      throw new ValueTooLargeError(
        `Max size for 'value' is ${MAX_SIZE_VALUE} bytes. Received ${bytesLength}`
      );
    }

    const [currentKeyValue, currentAppUsage] = await Promise.all([
      this.keyValuesRepository.getKeyValue({ did, key }),
      this.appUsageRepository.getAppUsage(did),
    ]);
    const isNewKeyValue = currentKeyValue === null;
    const isNewAppUsage = currentAppUsage === null;

    let didAppUsageInBytes = isNewAppUsage
      ? 0
      : parseInt(currentAppUsage.numberBytes, 10);

    if (isNewKeyValue) {
      didAppUsageInBytes += lengthInBytes(value);
    } else {
      // Calculate length difference between old value and new value (in bytes)
      didAppUsageInBytes +=
        lengthInBytes(value) - lengthInBytes(currentKeyValue.value);
    }

    if (didAppUsageInBytes >= MAX_APP_USAGE) {
      throw new ExcessiveAppUsageError("App exceeds the allowed space of 1GB");
    }

    await Promise.all([
      this.appUsageRepository.setAppUsage(
        { did, numberBytes: `${didAppUsageInBytes}` },
        isNewAppUsage
      ),
      this.keyValuesRepository.setKeyValue(keyValue, isNewKeyValue),
    ]);

    return {
      keyValue: { [key]: value },
      isNew: isNewKeyValue,
    };
  }

  async deleteKeyValue({
    did,
    key,
  }: {
    did: string;
    key: string;
  }): Promise<void> {
    const keyValue = await this.keyValuesRepository.getKeyValue({ did, key });

    if (!keyValue) {
      throw new NotFoundError(NotFoundError.defaultTitle, {
        detail: "Key not found",
      });
    }

    const currentAppUsage = await this.appUsageRepository.getAppUsage(did);
    const isNewAppUsage = currentAppUsage === null;
    const didAppUsageInBytes = isNewAppUsage
      ? 0
      : Math.max(
          0,
          parseInt(currentAppUsage.numberBytes, 10) -
            lengthInBytes(keyValue.value)
        );

    await Promise.all([
      this.keyValuesRepository.deleteKeyValue({ did, key }),
      this.appUsageRepository.setAppUsage(
        { did, numberBytes: `${didAppUsageInBytes}` },
        isNewAppUsage
      ),
    ]);
  }
}

export default { KeyValuesService };
