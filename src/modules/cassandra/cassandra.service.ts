import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { Injectable, Logger, OnApplicationShutdown } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import cassandra, { DseClientOptions } from "cassandra-driver";
import { StoredNotification } from "./cassandra.interface";

@Injectable()
export class CassandraService implements OnApplicationShutdown {
  private readonly logger = new Logger(CassandraService.name);

  client: cassandra.Client;

  optsWrite: DseClientOptions["queryOptions"];

  optsRead: DseClientOptions["queryOptions"];

  constructor(private configService: ConfigService) {
    this.client = new cassandra.Client(
      configService.get<DseClientOptions>("cassandraConnection")
    );
    this.optsWrite = this.configService.get("optsWrite");
    this.optsRead = this.configService.get("optsRead");
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.shutdown();
  }

  getClient(): cassandra.Client {
    return this.client;
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
    const queryInsert = `insert into notification_storage (id, sender, receiver, message) values (?, ?, ?, ?) using ttl ?`;
    const params = [id, from, to, message, ttl];
    await this.client.execute(queryInsert, params, {
      prepare: true,
      ...this.optsWrite,
    });
  }

  async getNotifications(to: string): Promise<StoredNotification[]> {
    const query = `select * from notification_storage where receiver = ? allow filtering`;
    const params = [to];
    const result = await this.client.execute(query, params);
    if (result.rowLength === 0) return new Array<StoredNotification>();
    const list = result.rows.map((row) => {
      return {
        id: row.get("id") as string,
        from: row.get("sender") as string,
        to: row.get("receiver") as string,
        message: row.get("message") as string,
      } as StoredNotification;
    });
    return list;
  }

  async getNotification(to: string, id: string): Promise<StoredNotification> {
    const query = `select * from notification_storage where receiver = ? and id = ? allow filtering`;
    const params = [to, id];
    const result = await this.client.execute(query, params);
    if (result.rowLength === 0)
      throw new NotFoundError("Notification Not Found", {
        detail: `Id parameter not found`,
      });
    return {
      id: result.rows[0].get("id") as string,
      from: result.rows[0].get("sender") as string,
      to: result.rows[0].get("receiver") as string,
      message: result.rows[0].get("message") as string,
    } as StoredNotification;
  }

  async deleteNotification(to: string, id: string): Promise<void> {
    await this.getNotification(to, id);
    const params = [id];
    const query = `delete from notification_storage where id = ?`;
    await this.client.execute(query, params);
  }
}

export default CassandraService;
