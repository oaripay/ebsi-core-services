import { Logger, Module } from "@nestjs/common";

import { ApiConfigModule } from "../../config/configuration.js";
import { AuthModule } from "../auth/auth.module.js";
import { LedgerModule } from "../ledger/ledger.module.js";
import JsonRpcController from "./jsonrpc.controller.js";
import { JsonRpcService } from "./jsonrpc.service.js";

@Module({
  controllers: [JsonRpcController],
  imports: [ApiConfigModule, AuthModule, LedgerModule],
  providers: [Logger, JsonRpcService],
})
export class JsonRpcModule {}

export default JsonRpcModule;
