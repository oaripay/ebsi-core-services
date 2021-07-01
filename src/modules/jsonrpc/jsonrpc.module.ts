import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import JsonRpcController from "./jsonrpc.controller";
import { JsonRpcService } from "./jsonrpc.service";
import { LedgerService } from "../../shared/services/ledger.service";
import RecordsService from "../records/records.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [ApiConfigModule, AuthModule],
  controllers: [JsonRpcController],
  providers: [Logger, JsonRpcService, LedgerService, RecordsService],
})
export class JsonRpcModule {}

export default JsonRpcModule;
