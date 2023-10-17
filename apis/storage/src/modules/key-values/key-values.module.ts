import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import { KeyValuesController } from "./key-values.controller.js";
import { KeyValuesService } from "./key-values.service.js";
import { AuthModule } from "../auth/auth.module.js";
import { CassandraModule } from "../cassandra/cassandra.module.js";

@Module({
  imports: [ApiConfigModule, AuthModule, CassandraModule],
  controllers: [KeyValuesController],
  providers: [Logger, KeyValuesService],
})
export class KeyValuesModule {}

export default KeyValuesModule;
