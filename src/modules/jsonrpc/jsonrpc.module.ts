import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import JsonRpcController from "./jsonrpc.controller";
import { JsonRpcService } from "./jsonrpc.service";
import CassandraService from "../../shared/services/cassandra.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [JsonRpcController],
  providers: [Logger, JsonRpcService, CassandraService],
})
export class JsonRpcModule {}

export default JsonRpcModule;
