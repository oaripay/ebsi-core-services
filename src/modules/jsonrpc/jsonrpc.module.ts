import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import JsonRpcController from "./jsonrpc.controller";
import JsonRpcService from "./jsonrpc.service";
import LedgerService from "../../shared/services/ledger.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [JsonRpcController],
  providers: [Logger, JsonRpcService, LedgerService],
})
export class JsonRpcModule {}

export default JsonRpcModule;
