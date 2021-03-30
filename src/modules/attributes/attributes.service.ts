import { Injectable, Logger } from "@nestjs/common";
import { BadRequestError } from "@cef-ebsi/problem-details-errors";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { ApiConfig } from "../../config/configuration";
import {
  AttributeResponseObject,
  AttributeCassandraModel,
  AxiosResponseJsonRpc,
  CassandraResponse,
} from "./attributes.interface";
import { AttributeBodyDto } from "./dto";
import { encrypt, decrypt } from "../../shared/utils";

interface PageOpts {
  fetchSize: number;
  pageState: string;
}

const SHARED_PREFIX = "__shared__";

@Injectable()
export class AttributesService {
  private readonly logger = new Logger(AttributesService.name);

  private urlJsonrpcStorage: string;

  private secret: string;

  private storage: string;

  private storageUri: string;

  // private accessToken: string;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.storage = this.configService.get<string>("storage");
    this.storageUri = `${this.storage}/stores/distributed`;
    this.urlJsonrpcStorage = `${this.storage}/stores/distributed/jsonrpc`;
    this.secret = this.configService.get<string>("encryptionSecret");
  }

  async storageJsonrpc(
    params: (string | PageOpts)[]
  ): Promise<CassandraResponse> {
    // TODO: check token expiration and login again

    const response: AxiosResponseJsonRpc = await axios.post(
      this.urlJsonrpcStorage,
      {
        jsonrpc: "2.0",
        method: "cassandra_call",
        params,
        id: Math.trunc(Math.random() * 1000),
      }
    );
    return response.data.result as CassandraResponse;
  }

  async getDidByAttributeHash(hash: string): Promise<string> {
    const result = await this.storageJsonrpc([
      "select did from attribute_storage where hash = ?",
      hash,
    ]);

    if (result.rows.length === 0) return "";
    return (result.rows[0] as AttributeCassandraModel).did;
  }

  async getAttributes(
    did: string,
    pageAfter: string,
    fetchSize: number
  ): Promise<{ attributes: AttributeResponseObject[]; pageAfter: string }> {
    // Note: The page state token can be manipulated to retrieve other results within the same
    // column family, so it is not safe to expose it to the users in plain text.
    // https://docs.datastax.com/en/developer/nodejs-driver/4.6/features/paging/
    let pageState = "";
    let readingSharedAttributes = false;
    if (pageAfter) {
      try {
        pageState = decrypt(pageAfter, this.secret);
        if (pageState.startsWith(SHARED_PREFIX)) {
          readingSharedAttributes = true;
          pageState = pageState.replace(SHARED_PREFIX, "");
        }
      } catch (e) {
        this.logger.error((e as Error).message, (e as Error).stack);
        throw new BadRequestError(BadRequestError.defaultTitle, {
          detail: "Invalid page[after] parameter",
        });
      }
    }

    const cassandraQuery = readingSharedAttributes
      ? "select * from attribute_storage where shared_with = ? allow filtering"
      : "select * from attribute_storage where did = ? allow filtering";

    const result = await this.storageJsonrpc([
      cassandraQuery,
      did,
      {
        ...(fetchSize && { fetchSize }),
        ...(pageState && pageState !== "null" && { pageState }),
      },
    ]);

    const { pageState: newPageState, rows } = result;

    const items = rows.map(
      (row): AttributeResponseObject => {
        const r = row as AttributeCassandraModel;
        return {
          storageUri: this.storageUri,
          hash: r.hash,
          did: r.did,
          visibility: r.visibility,
          sharedWith: r.shared_with,
          contentType: r.content_type,
          data: r.data,
          dataLabel: r.data_label,
        };
      }
    );

    let newPageAfter = "";
    if (newPageState || !readingSharedAttributes) {
      let state: string;
      if (newPageState && !readingSharedAttributes) {
        state = newPageState;
      } else {
        state = `${SHARED_PREFIX}${newPageState}`;
      }
      newPageAfter = encrypt(state, this.secret);
    }

    return { attributes: items, pageAfter: newPageAfter };
  }

  async insertAttribute(
    hash: string,
    attribute: AttributeBodyDto
  ): Promise<AttributeResponseObject> {
    await this.storageJsonrpc([
      "insert into attribute_storage (hash, did, visibility, shared_with, content_type, data, data_label) values (?, ?, ?, ?, ?, ?, ?)",
      hash,
      attribute.did,
      attribute.visibility ?? "private",
      attribute.sharedWith ?? "",
      attribute.contentType,
      attribute.data,
      attribute.dataLabel ?? "",
    ]);

    return {
      ...attribute,
      hash,
    };
  }

  async updateAttribute(
    hash: string,
    attribute: AttributeBodyDto
  ): Promise<AttributeResponseObject> {
    let cassandraQuery = "update attribute_storage set ";
    const { visibility, sharedWith, dataLabel, contentType } = attribute;
    const params: string[] = [];
    if (visibility) {
      cassandraQuery += "visibility = ?, ";
      params.push(visibility);
    }
    if (sharedWith) {
      cassandraQuery += "shared_with = ?, ";
      params.push(sharedWith);
    }
    if (dataLabel) {
      cassandraQuery += "data_label = ?, ";
      params.push(dataLabel);
    }
    cassandraQuery += "content_type = ? where hash = ?";
    params.push(contentType, hash);
    await this.storageJsonrpc([cassandraQuery, ...params]);

    return {
      ...attribute,
      hash,
    };
  }

  async deleteAttribute(hash: string): Promise<void> {
    await this.storageJsonrpc([
      "delete from attribute_storage where hash = ?",
      hash,
    ]);
  }
}

export default { AttributesService };
