import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BadRequestError } from "@cef-ebsi/problem-details-errors";
import { KeyValuesRepository } from "./key-values.repository";
import { PutKeyValuesResponseObject } from "./key-values.interface";
import { ApiConfig } from "../../config/configuration";

@Injectable()
export class KeyValuesService {
  private readonly logger = new Logger(KeyValuesService.name);

  constructor(
    private configService: ConfigService<ApiConfig>,
    private keyValuesRepository: KeyValuesRepository
  ) {}

  async putKeyValue(
    key: string,
    value: unknown,
    did: string
  ): Promise<{ keyValue: PutKeyValuesResponseObject; isNew: boolean }> {
    if (typeof value !== "string") {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: "Invalid value provided. Only strings are accepted.",
      });
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
