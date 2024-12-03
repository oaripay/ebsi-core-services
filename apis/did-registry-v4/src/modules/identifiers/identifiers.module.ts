import { Logger, Module } from "@nestjs/common";

import { ApiConfigModule } from "../../config/configuration.js";
import { LedgerModule } from "../ledger/ledger.module.js";
import IdentifiersController from "./identifiers.controller.js";
import IdentifiersService from "./identifiers.service.js";

@Module({
  controllers: [IdentifiersController],
  imports: [ApiConfigModule, LedgerModule],
  providers: [Logger, IdentifiersService],
})
export class IdentifiersModule {}

export default IdentifiersModule;
