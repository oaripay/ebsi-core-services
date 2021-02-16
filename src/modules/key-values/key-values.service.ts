import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  BadRequestError,
  NotFoundError,
} from "@cef-ebsi/problem-details-errors";
import { KeyValuesRepository } from "./key-values.repository";
import { PutKeyValuesResponseObject } from "./key-values.interface";
import { ValueTooLargeError } from "./errors";
import { ApiConfig } from "../../config/configuration";
import { lengthInBytes } from "../../shared/utils";

const MAX_SIZE_VALUE = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class KeyValuesService {
  private readonly logger = new Logger(KeyValuesService.name);

  constructor(
    private configService: ConfigService<ApiConfig>,
    private keyValuesRepository: KeyValuesRepository
  ) {}

  async getKeys(
    did: string,
    pageAfter: string,
    pageSize: number
  ): Promise<{ keys: string[]; pageState: string }> {
    const { items, pageState } = await this.keyValuesRepository.getKeyValues(
      did,
      pageAfter,
      pageSize
    );

    return { keys: items, pageState };
  }

  async getKeyValue({
    did,
    key,
  }: {
    did: string;
    key: string;
  }): Promise<string> {
    const keyValue = await this.keyValuesRepository.getKeyValue(did, key);

    if (!keyValue) {
      throw new NotFoundError(NotFoundError.defaultTitle, {
        detail: "key not found",
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

    const bytesLength = lengthInBytes(value);
    if (bytesLength > MAX_SIZE_VALUE) {
      throw new ValueTooLargeError(
        `Max size for 'value' is ${MAX_SIZE_VALUE} bytes. Received ${bytesLength}`
      );
    }

    const { operation } = await this.keyValuesRepository.setKey(
      did,
      key,
      value
    );

    return {
      keyValue: { [key]: value },
      isNew: operation === "insert",
    };
  }
}

export default { KeyValuesService };
