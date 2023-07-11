import { Module, Logger } from "@nestjs/common";
import { IsIssuerProxy } from "../../shared/validators/IsIssuerProxy";
import { ApiConfigModule } from "../../config/configuration";
import { JsonRpcController } from "./jsonrpc.controller";
import { JsonRpcService } from "./jsonrpc.service";
import { LedgerService } from "../ledger/ledger.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [ApiConfigModule, AuthModule],
  controllers: [JsonRpcController],
  providers: [IsIssuerProxy, Logger, JsonRpcService, LedgerService],
})
export class JsonRpcModule {}

export default JsonRpcModule;
