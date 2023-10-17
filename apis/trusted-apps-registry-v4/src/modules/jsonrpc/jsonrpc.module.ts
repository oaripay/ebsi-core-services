import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import JsonRpcController from "./jsonrpc.controller.js";
import { JsonRpcService } from "./jsonrpc.service.js";
import { LedgerModule } from "../ledger/ledger.module.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
  imports: [ApiConfigModule, AuthModule, LedgerModule],
  controllers: [JsonRpcController],
  providers: [Logger, JsonRpcService],
})
export class JsonRpcModule {}

export default JsonRpcModule;
