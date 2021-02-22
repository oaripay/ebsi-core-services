import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CassandraService } from "./cassandra.service";
import {
  AppUsageRepository,
  FilesRepository,
  KeyValuesRepository,
} from "./repositories";
import { ApiConfigModule } from "../../config/configuration";
import { cassandraConfig } from "../../config/cassandra.config";

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
