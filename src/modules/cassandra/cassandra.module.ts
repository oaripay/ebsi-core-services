import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CassandraService } from "./cassandra.service";
import { ApiConfigModule } from "../../config/configuration";
import { cassandraConfig } from "../../config/cassandra.config";

@Module({
  imports: [ApiConfigModule, ConfigModule.forFeature(cassandraConfig)],
  controllers: [],
  providers: [ConfigService, CassandraService],
  exports: [CassandraService],
})
export class CassandraModule {}

export default CassandraModule;
