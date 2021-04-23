import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import {
  StoredNotification,
  AxiosResponseJsonRpc,
  CassandraResponse,
  PageOpts,
} from "./cassandra.interface";
import { ApiConfig } from "../../config/configuration";

@Injectable()
export class CassandraService {
  private readonly logger = new Logger(CassandraService.name);

  private urlJsonrpcStorage: string;

  constructor(private configService: ConfigService<ApiConfig>) {
    const storageApi = this.configService.get<string>("storage");
    this.urlJsonrpcStorage = `${storageApi}/stores/distributed/jsonrpc`;
  }

  async storageJsonrpc(
    params: (string | number | PageOpts)[]
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

  async insertNotification(
    id: string,
    issuanceDateStr: string,
    expirationDateStr: string,
    from: string,
    to: string,
    message: string
  ): Promise<void> {
    const issuanceDate = new Date(issuanceDateStr);
    const expirationDate = new Date(expirationDateStr);
    const ttl = Math.trunc(
      (expirationDate.getTime() - issuanceDate.getTime()) / 1000
    );
    const queryInsert =
      "insert into notification_storage (id, sender, receiver, message) values (?, ?, ?, ?) using ttl ?";

    await this.storageJsonrpc([queryInsert, id, from, to, message, ttl]);
  }

  async getNotifications(to: string): Promise<StoredNotification[]> {
    const query =
      "select * from notification_storage where receiver = ? allow filtering";

    const result = await this.storageJsonrpc([query, to]);

    if (result.rows.length === 0) return new Array<StoredNotification>();

    const list = result.rows.map(
      (row: {
        id?: string;
        sender?: string;
        receiver?: string;
        message?: string;
      }) => {
        return {
          id: row?.id ?? "",
          from: row?.sender ?? "",
          to: row?.receiver ?? "",
          message: row?.message ?? "",
        } as StoredNotification;
      }
    );
    return list;
  }

  async getNotification(to: string, id: string): Promise<StoredNotification> {
    const query =
      "select * from notification_storage where receiver = ? and id = ? allow filtering";

    const result = await this.storageJsonrpc([query, to, id]);

    if (result.rows.length === 0) {
      throw new NotFoundError("Notification Not Found", {
        detail: `Id parameter not found`,
      });
    }

    const firstRow = (result.rows[0] || {}) as {
      id?: string;
      sender?: string;
      receiver?: string;
      message?: string;
    };

    return {
      id: firstRow.id ?? "",
      from: firstRow.sender ?? "",
      to: firstRow.receiver ?? "",
      message: firstRow.message ?? "",
    } as StoredNotification;
  }

  async deleteNotification(to: string, id: string): Promise<void> {
    await this.getNotification(to, id);
    const query = "delete from notification_storage where id = ?";
    await this.storageJsonrpc([query, id]);
  }
}

export default CassandraService;
