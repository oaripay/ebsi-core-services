import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import JsonRpcController from "./jsonrpc.controller";
import { JsonRpcService } from "./jsonrpc.service";
import { AuthModule } from "../auth/auth.module";
import { LedgerModule } from "../ledger/ledger.module";

@Module({
  imports: [ApiConfigModule, AuthModule, LedgerModule],
  controllers: [JsonRpcController],
  providers: [Logger, JsonRpcService],
})
export class JsonRpcModule {}

export default JsonRpcModule;
