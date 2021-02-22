import { Injectable, OnApplicationBootstrap, Logger } from "@nestjs/common";
import { mapping, types, QueryOptions } from "cassandra-driver";
import { CassandraService } from "../cassandra.service";
import { KeyValueModel } from "../models/key-value.model";
import { CASSANDRA_EXCEPTIONS } from "../cassandra.constants";

const TABLE_KEY_VALUE_STORAGE = "key_value_storage";

@Injectable()
export class KeyValuesRepository implements OnApplicationBootstrap {
  private readonly logger = new Logger(KeyValuesRepository.name);

  keyValueMapper: mapping.ModelMapper<KeyValueModel>;

  constructor(private cassandraService: CassandraService) {}

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

  async getKeyValue({
    did,
    key,
  }: {
    did: string;
    key: string;
  }): Promise<KeyValueModel> {
    const result = await this.keyValueMapper.find({ did, key });
    return result.first();
  }

  async getKeyValues(
    did: string,
    requestedPageState: string,
    pageSize: number
  ): Promise<types.ResultSet> {
    const query = `select key from ${TABLE_KEY_VALUE_STORAGE} where did = ?`;
    const params = [did];

    const opts: QueryOptions = {
      prepare: true,
      fetchSize: pageSize,
      ...(requestedPageState && { pageState: requestedPageState }),
    };

    try {
      return await this.cassandraService
        .getClient()
        .execute(query, params, opts);
    } catch (e) {
      this.logger.error((e as Error).message, (e as Error).stack);
      if ((e as Error).message.includes("Invalid value for the paging state")) {
        throw new Error(CASSANDRA_EXCEPTIONS.PAGE_STATE_ERROR);
      }
      throw e;
    }
  }

  async setKeyValue(
    keyValue: KeyValueModel,
    isNewKeyValue: boolean
  ): Promise<mapping.Result<KeyValueModel>> {
    return isNewKeyValue
      ? this.keyValueMapper.insert(keyValue)
      : this.keyValueMapper.update(keyValue);
  }

  async deleteKeyValue({
    did,
    key,
  }: {
    did: string;
    key: string;
  }): Promise<void> {
    await this.keyValueMapper.remove({ did, key });
  }
}

export default KeyValuesRepository;
