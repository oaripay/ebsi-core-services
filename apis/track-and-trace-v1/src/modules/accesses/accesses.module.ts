import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import AccessesController from "./accesses.controller.js";
import AccessesService from "./accesses.service.js";
import { LedgerModule } from "../ledger/ledger.module.js";

@Module({
  imports: [ApiConfigModule, LedgerModule],
  controllers: [AccessesController],
  providers: [Logger, AccessesService],
})
export class AccessesModule {}

export default AccessesModule;
