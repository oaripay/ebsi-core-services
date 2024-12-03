import { Logger, Module } from "@nestjs/common";

import { ApiConfigModule } from "../../config/configuration.js";
import { LedgerModule } from "../ledger/ledger.module.js";
import AccessesController from "./accesses.controller.js";
import AccessesService from "./accesses.service.js";

@Module({
  controllers: [AccessesController],
  imports: [ApiConfigModule, LedgerModule],
  providers: [Logger, AccessesService],
})
export class AccessesModule {}

export default AccessesModule;
