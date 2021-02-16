import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { JsonRpcController } from "./jsonrpc.controller";
import { JsonRpcService } from "./jsonrpc.service";
import { CassandraModule } from "../cassandra/cassandra.module";

@Module({
  imports: [ApiConfigModule, CassandraModule],
  controllers: [JsonRpcController],
  providers: [Logger, JsonRpcService],
})
export class JsonRpcModule {}

export default JsonRpcModule;
