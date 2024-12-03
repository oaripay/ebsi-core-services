import { Logger, Module } from "@nestjs/common";

import { ApiConfigModule } from "../../config/configuration.js";
import { LedgerModule } from "../ledger/ledger.module.js";
import TimestampsController from "./timestamps.controller.js";
import TimestampsService from "./timestamps.service.js";

@Module({
  controllers: [TimestampsController],
  imports: [ApiConfigModule, LedgerModule],
  providers: [Logger, TimestampsService],
})
export class TimestampsModule {}

export default TimestampsModule;
