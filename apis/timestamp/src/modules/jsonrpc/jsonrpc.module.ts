import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import JsonRpcController from "./jsonrpc.controller.js";
import { JsonRpcService } from "./jsonrpc.service.js";
import { LedgerService } from "../ledger/ledger.service.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
  imports: [ApiConfigModule, AuthModule],
  controllers: [JsonRpcController],
  providers: [Logger, JsonRpcService, LedgerService],
})
export class JsonRpcModule {}

export default JsonRpcModule;
