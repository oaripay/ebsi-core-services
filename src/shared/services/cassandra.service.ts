import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "cassandra-driver";
import {
  ApiConfig,
  CassandraConsistency,
  CassandraOptions,
} from "../../config/configuration";

@Injectable()
export default class CassandraService implements OnApplicationShutdown {
  private client: Client;

  private consistency: CassandraConsistency;

  constructor(private configService: ConfigService<ApiConfig>) {
    const cassandraOptions = this.configService.get<CassandraOptions>(
      "cassandraOptions"
    );
    this.client = new Client(cassandraOptions.connection);
    this.consistency = cassandraOptions.consistency;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.shutdown();
  }

  getClient(): Client {
    return this.client;
  }

  getConsistency(): CassandraConsistency {
    return this.consistency;
  }
}
