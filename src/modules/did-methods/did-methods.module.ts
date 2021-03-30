import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import DidMethodsController from "./did-methods.controller";
import DidMethodsService from "./did-methods.service";
import { ContractService } from "../../shared/services/contract.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [DidMethodsController],
  providers: [Logger, DidMethodsService, ContractService],
})
export class DidMethodsModule {}

export default DidMethodsModule;
