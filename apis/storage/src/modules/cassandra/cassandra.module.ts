import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CassandraService } from "./cassandra.service.js";
import {
  AppUsageRepository,
  FilesRepository,
  KeyValuesRepository,
} from "./repositories/index.js";
import { ApiConfigModule } from "../../config/configuration.js";
import { cassandraConfig } from "../../config/cassandra.config.js";

@Module({
  imports: [ApiConfigModule, ConfigModule.forFeature(cassandraConfig)],
  controllers: [],
  providers: [
    ConfigService,
    CassandraService,
    AppUsageRepository,
    FilesRepository,
    KeyValuesRepository,
  ],
  exports: [
    CassandraService,
    AppUsageRepository,
    FilesRepository,
    KeyValuesRepository,
  ],
})
export class CassandraModule {}

export default CassandraModule;
