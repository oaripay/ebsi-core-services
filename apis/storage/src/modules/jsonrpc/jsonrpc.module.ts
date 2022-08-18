import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { JsonRpcController } from "./jsonrpc.controller";
import { JsonRpcService } from "./jsonrpc.service";
import { CassandraModule } from "../cassandra/cassandra.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [ApiConfigModule, AuthModule, CassandraModule],
  controllers: [JsonRpcController],
  providers: [Logger, JsonRpcService],
})
export class JsonRpcModule {}

export default JsonRpcModule;
