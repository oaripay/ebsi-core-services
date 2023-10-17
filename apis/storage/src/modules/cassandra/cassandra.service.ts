import {
  Injectable,
  Inject,
  OnModuleInit,
  OnApplicationShutdown,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { Client, mapping } from "cassandra-driver";
import {
  cassandraConfig,
  CassandraConsistency,
} from "../../config/cassandra.config.js";

@Injectable()
export class CassandraService implements OnModuleInit, OnApplicationShutdown {
  client!: Client;

  consistency!: CassandraConsistency;

  constructor(
    @Inject(cassandraConfig.KEY)
    private dbConfig: ConfigType<typeof cassandraConfig>,
  ) {}

  onModuleInit(): void {
    this.client = new Client(this.dbConfig.client);
    this.consistency = this.dbConfig.consistency;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.shutdown();
  }

  createMapper(mappingOptions: mapping.MappingOptions): mapping.Mapper {
    return new mapping.Mapper(this.client, mappingOptions);
  }

  getClient(): Client {
    return this.client;
  }

  getConsistency(): CassandraConsistency {
    return this.consistency;
  }
}

export default CassandraService;
