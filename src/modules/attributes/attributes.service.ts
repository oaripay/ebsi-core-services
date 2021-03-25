import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import {
  AttributeResponseObject,
  AxiosResponseJsonRpc,
  CassandraResponse,
} from "./attributes.interface";
import { AttributeBodyDto } from "./dto";
import { ApiConfig } from "../../config/configuration";

@Injectable()
export class AttributesService {
  private readonly logger = new Logger(AttributesService.name);

  private urlJsonrpcStorage: string;

  // private accessToken: string;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.urlJsonrpcStorage = `${this.configService.get<string>(
      "storage"
    )}/stores/distributed/jsonrpc`;
  }

  async storageJsonrpc(params: string[]): Promise<CassandraResponse> {
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

  async existAttribute(hash: string, did: string): Promise<boolean> {
    const result = await this.storageJsonrpc([
      "select did from attribute_storage where hash = ? and did = ?",
      hash,
      did,
    ]);
    return result.rows.length > 0;
  }

  async insertAttribute(
    hash: string,
    attribute: AttributeBodyDto
  ): Promise<AttributeResponseObject> {
    await this.storageJsonrpc([
      "insert into attribute_storage (hash, did, visibility, content_type, data, data_label) values (?, ?, ?, ?, ?, ?)",
      hash,
      attribute.did,
      attribute.visibility,
      attribute.contentType,
      attribute.data,
      attribute.dataLabel,
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
    await this.storageJsonrpc([
      "update attribute_storage set visibility = ?, content_type = ?, data_label = ? where hash = ? and did = ?",
      attribute.visibility,
      attribute.contentType,
      attribute.dataLabel,
      hash,
      attribute.did,
    ]);

    return {
      ...attribute,
      hash,
    };
  }
}

export default { AttributesService };
