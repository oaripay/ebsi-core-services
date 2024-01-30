import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import AccessesController from "./accesses.controller.js";
import AccessesService from "./accesses.service.js";
import { LedgerService } from "../ledger/ledger.service.js";

@Module({
  imports: [ApiConfigModule],
  controllers: [AccessesController],
  providers: [Logger, AccessesService, LedgerService],
})
export class AccessesModule {}

export default AccessesModule;
