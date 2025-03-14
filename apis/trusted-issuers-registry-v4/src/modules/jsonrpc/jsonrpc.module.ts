import { Logger, Module } from "@nestjs/common";

import { ApiConfigModule } from "../../config/configuration.ts";
import { IsIssuerProxy } from "../../shared/validators/IsIssuerProxy.ts";
import { AuthModule } from "../auth/auth.module.ts";
import { LedgerModule } from "../ledger/ledger.module.ts";
import { JsonRpcController } from "./jsonrpc.controller.ts";
import { JsonRpcService } from "./jsonrpc.service.ts";

@Module({
  controllers: [JsonRpcController],
  imports: [ApiConfigModule, AuthModule, LedgerModule],
  providers: [IsIssuerProxy, Logger, JsonRpcService],
})
export class JsonRpcModule {}
