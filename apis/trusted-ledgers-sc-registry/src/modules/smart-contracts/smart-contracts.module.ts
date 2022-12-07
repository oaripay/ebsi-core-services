import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { SmartContractsController } from "./smart-contracts.controller";
import { SmartContractsService } from "./smart-contracts.service";
import { ContractService } from "../contract/contract.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [SmartContractsController],
  providers: [Logger, ContractService, SmartContractsService],
})
export class SmartContractsModule {}

export default SmartContractsModule;
