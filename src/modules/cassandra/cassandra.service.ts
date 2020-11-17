import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import cassandra, { DseClientOptions } from "cassandra-driver";
import { StoredNotification } from "./cassandra.interface";

@Injectable()
export class CassandraService {
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

  getClient(): cassandra.Client {
    return this.client;
  }

  async insertNotification(
    id: string,
    issuanceDate: string,
    expirationDate: string,
    from: string,
    to: string,
    message: string
  ): Promise<void> {
    const queryInsert = `insert into notification_storage (id, issuanceDate, expirationDate, sender, receiver, message) values (?, ?, ?, ?, ?, ?)`;
    const params = [
      id,
      new Date(issuanceDate),
      new Date(expirationDate),
      from,
      to,
      message,
    ];
    await this.client.execute(queryInsert, params, this.optsWrite);
  }

  async getNotifications(to: string): Promise<StoredNotification[]> {
    const query = `select * from notification_storage where receiver = ? allow filtering`;
    const params = [to];
    const result = await this.client.execute(query, params);
    if (result.rowLength === 0) return new Array<StoredNotification>();
    const list = result.rows.map((row) => {
      return {
        id: row.get("id") as string,
        issuanceDate: row.get("issuancedate") as string,
        expirationDate: row.get("expirationdate") as string,
        from: row.get("sender") as string,
        to: row.get("receiver") as string,
        message: row.get("message") as string,
      } as StoredNotification;
    });
    return list;
  }

  // TODO
  deleteNotification(id: string) {
    console.log(`delete notification ${id}`);
  }
}

export default CassandraService;
