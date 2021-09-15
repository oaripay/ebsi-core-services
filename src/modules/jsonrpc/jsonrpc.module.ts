import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import JsonRpcController from "./jsonrpc.controller";
import { JsonRpcService } from "./jsonrpc.service";
import { ContractService } from "../../shared/services/contract.service";
import { AuthModule } from "../auth/auth.module";
import AdministratorsService from "../administrators/administrators.service";

@Module({
  imports: [ApiConfigModule, AuthModule],
  controllers: [JsonRpcController],
  providers: [Logger, ContractService, JsonRpcService, AdministratorsService],
})
export class JsonRpcModule {}

export default JsonRpcModule;
