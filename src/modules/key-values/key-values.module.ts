import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { KeyValuesController } from "./key-values.controller";
import { KeyValuesService } from "./key-values.service";
import { KeyValuesRepository } from "./key-values.repository";
import { AppUsageRepository } from "./app-usage.repository";
import { AuthModule } from "../auth/auth.module";
import { CassandraModule } from "../cassandra/cassandra.module";

@Module({
  imports: [ApiConfigModule, AuthModule, CassandraModule],
  controllers: [KeyValuesController],
  providers: [
    Logger,
    AppUsageRepository,
    KeyValuesRepository,
    KeyValuesService,
  ],
})
export class KeyValuesModule {}

export default KeyValuesModule;
