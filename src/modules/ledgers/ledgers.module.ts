import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { LedgersController } from "./ledgers.controller";
import { LedgersService } from "./ledgers.service";
import { ContractService } from "../../shared/services/contract.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [LedgersController],
  providers: [Logger, ContractService, LedgersService],
})
export class LedgersModule {}

export default LedgersModule;
