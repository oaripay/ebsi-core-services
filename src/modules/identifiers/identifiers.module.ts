import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import IdentifiersController from "./identifiers.controller";
import IdentifiersService from "./identifiers.service";
import { ContractService } from "../../shared/services/contract.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [IdentifiersController],
  providers: [Logger, IdentifiersService, ContractService],
})
export class IdentifiersModule {}

export default IdentifiersModule;
