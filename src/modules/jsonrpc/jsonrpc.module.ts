import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { JsonRpcController } from "./jsonrpc.controller";
import { JsonRpcService } from "./jsonrpc.service";
import { LedgerService } from "../../shared/services/ledger.service";
import { AuthModule } from "../auth/auth.module";
import { AdministratorsService } from "../administrators/administrators.service";

@Module({
  imports: [ApiConfigModule, AuthModule],
  controllers: [JsonRpcController],
  providers: [Logger, JsonRpcService, LedgerService, AdministratorsService],
})
export class JsonRpcModule {}

export default JsonRpcModule;
