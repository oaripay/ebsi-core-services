import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import TimestampsController from "./timestamps.controller";
import TimestampsService from "./timestamps.service";
import { LedgerService } from "../ledger/ledger.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [TimestampsController],
  providers: [Logger, TimestampsService, LedgerService],
})
export class TimestampsModule {}

export default TimestampsModule;
