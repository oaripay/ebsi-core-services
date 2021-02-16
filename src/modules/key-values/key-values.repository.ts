/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable, OnApplicationBootstrap, Logger } from "@nestjs/common";
import { mapping } from "cassandra-driver";
// import jsonpatch from "fast-json-patch";
// import querystring from "querystring";
import { CassandraService } from "../cassandra/cassandra.service";
import { KeyValueModel } from "./models/key-value.model";
import {
  ExcessiveAppUsageError,
  KeyTooLargeError,
  ValueTooLargeError,
} from "./errors";
import { AppUsageRepository } from "./app-usage.repository";
import { lengthInBytes } from "../../shared/utils";

const TABLE_KEY_VALUE_STORAGE = "key_value_storage";
const MAX_SIZE_KEY = 256; // 256 bytes
const MAX_SIZE_VALUE = 5 * 1024 * 1024; // 5 MB
const MAX_APP_USAGE = 1024 * 1024 * 1024; // 1GB
// const DEFAULT_PAGE_SIZE = 10;

@Injectable()
export class KeyValuesRepository implements OnApplicationBootstrap {
  private readonly logger = new Logger(KeyValuesRepository.name);

  keyValueMapper: mapping.ModelMapper<KeyValueModel>;

  constructor(
    private cassandraService: CassandraService,
    private appUsageRepository: AppUsageRepository
  ) {}

  onApplicationBootstrap() {
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

  async getRecord(did: string, key: string) {
    const result = await this.keyValueMapper.find({ did, key });
    return result.first();
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

  async setKey(
    did: string,
    key: string,
    value: string
  ): Promise<{ operation: "insert" | "update" }> {
    if (key.length > MAX_SIZE_KEY) {
      throw new KeyTooLargeError(
        `Max size for 'key' is ${MAX_SIZE_KEY} bytes. Received ${key.length}`
      );
    }

    if (value.length > MAX_SIZE_VALUE) {
      throw new ValueTooLargeError(
        `Max size for 'value' is ${MAX_SIZE_VALUE} bytes. Received ${value.length}`
      );
    }

    const doc = {
      did,
      key,
      value,
    };

    const currentRecord = await this.getRecord(did, key);
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
  async getKey(key) {
    const record = await this.getRecord(key);
    if (!record)
      throw new NotFoundError(NotFoundError.defaultTitle, {
        detail: "key not found",
      });
    const value = record.value;

    // convert to JSON if it is the case
    let value;
    try {
      value = JSON.parse(value);
    } catch (error) {
      value = value;
    }
    return value;
  }

  async deleteKey(key) {
    const record = await this.getRecord(key);
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

  async patchKey(key, patch) {
    const value = await this.getKey(key);
    if (typeof value !== "object")
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: `The key to be patched is not a JSON but a ${typeof value}`,
      });

    let newValue;
    try {
      newValue = jsonpatch.applyPatch(value, patch).newDocument;
    } catch (error) {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: `Impossible to apply patch: ${error.message}`,
      });
    }

    const { result } = await this.setKey(key, newValue, true);

    return result[key];
  }

  buildLink(after, size) {
    const query = {};

    if (size && size !== DEFAULT_PAGE_SIZE) query["page[size]"] = size;
    if (after) query["page[after]"] = after;

    return `/storage/v1/stores/distributed/key-values?${querystring.stringify(
      query
    )}`;
  }

  async getListKeys(q) {
    let pageSize = DEFAULT_PAGE_SIZE;
    let pageAfter;
    if (q && q.page) {
      const { page } = q;
      if (page.size) pageSize = parseInt(page.size, 10);
      if (page.after) pageAfter = page.after;
    }

    const query = `select key from ${TABLE_KEY_VALUE_STORAGE}`;
    const params = [];

    const opts: { [x: string]: unknown } = {
      prepare: true,
      fetchSize: pageSize,
    };

    if (pageAfter) opts.pageState = pageAfter;
    const result = await this.cassandraService
      .getClient()
      .execute(query, params, opts);
    const { pageState } = result;

    const items = result.rows.map((r): unknown => r.key);

    const links: { [x: string]: string } = {
      first: this.buildLink(null, pageSize),
    };

    if (pageState) links.next = this.buildLink(pageState, pageSize);
    else links.last = this.buildLink(pageAfter, pageSize);

    return {
      items,
      total: items.length,
      pageSize,
      links,
    };
  }
  */
}

export default KeyValuesRepository;
