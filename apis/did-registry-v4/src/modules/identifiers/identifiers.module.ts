import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import IdentifiersController from "./identifiers.controller.js";
import IdentifiersService from "./identifiers.service.js";
import { LedgerModule } from "../ledger/ledger.module.js";

@Module({
  imports: [ApiConfigModule, LedgerModule],
  controllers: [IdentifiersController],
  providers: [Logger, IdentifiersService],
})
export class IdentifiersModule {}

export default IdentifiersModule;
