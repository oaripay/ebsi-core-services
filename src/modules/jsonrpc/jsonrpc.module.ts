import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import JsonRpcController from "./jsonrpc.controller";
import { JsonRpcService } from "./jsonrpc.service";
import { AuthModule } from "../auth/auth.module";
import DidMethodsService from "../did-methods/did-methods.service";
import { IsDidRule, IsHexadecimalDidRule } from "./validators";
import { AdministratorsService } from "../administrators/administrators.service";
import { LedgerModule } from "../ledger/ledger.module";

@Module({
  imports: [ApiConfigModule, AuthModule, LedgerModule],
  controllers: [JsonRpcController],
  providers: [
    Logger,
    JsonRpcService,
    AdministratorsService,
    DidMethodsService,
    IsHexadecimalDidRule,
    IsDidRule,
  ],
})
export class JsonRpcModule {}

export default JsonRpcModule;
