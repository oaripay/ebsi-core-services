import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import AppsController from "./apps.controller.js";
import AppsService from "./apps.service.js";
import { LedgerModule } from "../ledger/ledger.module.js";

@Module({
  imports: [ApiConfigModule, LedgerModule],
  controllers: [AppsController],
  providers: [Logger, AppsService],
})
export class AppsModule {}

export default AppsModule;
