import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import JsonRpcController from "./jsonrpc.controller";
import { JsonRpcService } from "./jsonrpc.service";
import { LedgerModule } from "../ledger/ledger.module";
import { AuthModule } from "../auth/auth.module";
import AdministratorsService from "../administrators/administrators.service";

@Module({
  imports: [ApiConfigModule, AuthModule, LedgerModule],
  controllers: [JsonRpcController],
  providers: [Logger, JsonRpcService, AdministratorsService],
})
export class JsonRpcModule {}

export default JsonRpcModule;
