import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import TimestampsController from "./timestamps.controller.js";
import TimestampsService from "./timestamps.service.js";
import { LedgerModule } from "../ledger/ledger.module.js";

@Module({
  imports: [ApiConfigModule, LedgerModule],
  controllers: [TimestampsController],
  providers: [Logger, TimestampsService],
})
export class TimestampsModule {}

export default TimestampsModule;
