import { Injectable, OnApplicationBootstrap, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  BadRequestError,
  InternalServerError,
} from "@cef-ebsi/problem-details-errors";
import { mapping, types } from "cassandra-driver";
import { CassandraService } from "../cassandra/cassandra.service";
import { KeyValueModel } from "./models/key-value.model";
import { ExcessiveAppUsageError } from "./errors";
import { AppUsageRepository } from "./app-usage.repository";
import { ApiConfig } from "../../config/configuration";
import { lengthInBytes, encrypt, decrypt } from "../../shared/utils";

const TABLE_KEY_VALUE_STORAGE = "key_value_storage";
const MAX_APP_USAGE = 1024 * 1024 * 1024; // 1GB

@Injectable()
export class KeyValuesRepository implements OnApplicationBootstrap {
  private readonly logger = new Logger(KeyValuesRepository.name);

  keyValueMapper: mapping.ModelMapper<KeyValueModel>;

  constructor(
    private configService: ConfigService<ApiConfig>,
    private cassandraService: CassandraService,
    private appUsageRepository: AppUsageRepository
  ) {}

  onApplicationBootstrap(): void {
    const mappingOptions: mapping.MappingOptions = {
      models: {
        KeyValue: {
          tables: [TABLE_KEY_VALUE_STORAGE],
          mappings: new mapping.UnderscoreCqlToCamelCaseMappings(),
        },
      },
    };

    this.keyValueMapper = this.cassandraService
      .createMapper(mappingOptions)
      .forModel("KeyValue");
  }

  private async setAppUsage(
    did: string,
    didAppUsageInBytes: number,
    isNewApp: boolean
  ) {
    return isNewApp
      ? this.appUsageRepository.insertAppUsage(did, `${didAppUsageInBytes}`)
      : this.appUsageRepository.updateAppUsage(did, `${didAppUsageInBytes}`);
  }

  async getKeyValue(did: string, key: string): Promise<KeyValueModel> {
    const result = await this.keyValueMapper.find({ did, key });
    return result.first();
  }

  async getKeyValues(
    did: string,
    requestedPageState: string,
    pageSize: number
  ): Promise<{ items: string[]; pageState: string }> {
    const query = `select key from ${TABLE_KEY_VALUE_STORAGE} where did = ?`;
    const params = [did];

    const opts: { [x: string]: unknown } = {
      prepare: true,
      fetchSize: pageSize,
    };

    // Note: The page state token can be manipulated to retrieve other results within the same
    // column family, so it is not safe to expose it to the users in plain text.
    // https://docs.datastax.com/en/developer/nodejs-driver/4.6/features/paging/
    if (requestedPageState) {
      try {
        // Decrypt pageState
        opts.pageState = decrypt(
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
      result = await this.cassandraService
        .getClient()
        .execute(query, params, opts);
    } catch (e) {
      this.logger.error((e as Error).message, (e as Error).stack);
      if ((e as Error).message.includes("Invalid value for the paging state")) {
        throw new BadRequestError(BadRequestError.defaultTitle, {
          detail: "Invalid page[after] parameter",
        });
      }
      throw new InternalServerError();
    }

    const { pageState: rawPageState, rows } = result;

    let encryptedPageState = "";
    if (rawPageState) {
      // Encrypt page state
      encryptedPageState = encrypt(
        rawPageState,
        this.configService.get("encryptionSecret")
      );
    }

    const items = rows.map(
      (r): string => ((r as unknown) as KeyValueModel).key
    );

    return {
      items,
      pageState: encryptedPageState,
    };
  }

  async setKey(
    did: string,
    key: string,
    value: string
  ): Promise<{ operation: "insert" | "update" }> {
    const doc = {
      did,
      key,
      value,
    };

    const currentRecord = await this.getKeyValue(did, key);
    const isNewRecord = currentRecord === null;
    const currentAppUsage = await this.appUsageRepository.getAppUsage(did);
    const isNewApp = currentAppUsage === null;

    let didAppUsageInBytes = isNewApp
      ? 0
      : parseInt(currentAppUsage.numberBytes, 10);

    if (isNewRecord) {
      didAppUsageInBytes += lengthInBytes(value);
    } else {
      // Calculate length difference between old value and new value (in bytes)
      didAppUsageInBytes +=
        lengthInBytes(value) - lengthInBytes(currentRecord.value);
    }

    if (didAppUsageInBytes >= MAX_APP_USAGE) {
      throw new ExcessiveAppUsageError("App exceeds the allowed space of 1GB");
    }

    if (isNewRecord) {
      await Promise.all([
        this.setAppUsage(did, didAppUsageInBytes, isNewApp),
        this.keyValueMapper.insert(doc),
      ]);

      return { operation: "insert" };
    }

    await Promise.all([
      this.setAppUsage(did, didAppUsageInBytes, isNewApp),
      this.keyValueMapper.update(doc),
    ]);

    return { operation: "update" };
  }

  /*
  async deleteKey(key) {
    const record = await this.getKeyValue(key);
    if (!record)
      throw new NotFoundError(NotFoundError.defaultTitle, {
        detail: "key not found",
      });
    const query = `delete from ${TABLE_KEY_VALUE_STORAGE} where key = ?`;

    const result = await this.cassandraService
      .getClient()
      .execute(query, [key]);

    if (!result.info || !result.info.isSchemaInAgreement) {
      logger.error(result);
      throw new Error(`Bad response from cassandra when deleting a key`);
    }
  }
  */
}

export default KeyValuesRepository;
