import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import JsonRpcController from "./jsonrpc.controller";
import { JsonRpcService } from "./jsonrpc.service";
import { ContractService } from "../../shared/services/contract.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [JsonRpcController],
  providers: [Logger, ContractService, JsonRpcService],
})
export class JsonRpcModule {}

export default JsonRpcModule;
