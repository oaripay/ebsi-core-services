import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import TimestampsController from "./timestamps.controller.js";
import TimestampsService from "./timestamps.service.js";
import { LedgerService } from "../ledger/ledger.service.js";

@Module({
  imports: [ApiConfigModule],
  controllers: [TimestampsController],
  providers: [Logger, TimestampsService, LedgerService],
})
export class TimestampsModule {}

export default TimestampsModule;
