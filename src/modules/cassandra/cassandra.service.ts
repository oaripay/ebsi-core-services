import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import cassandra, { DseClientOptions } from "cassandra-driver";

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
      new Date(issuanceDate).getTime(),
      new Date(expirationDate).getTime(),
      from,
      to,
      message,
    ];
    await this.client.execute(queryInsert, params, this.optsWrite);
  }
}

export default CassandraService;
