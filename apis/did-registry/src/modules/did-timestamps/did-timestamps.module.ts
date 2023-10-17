import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import { DidTimestampsController } from "./did-timestamps.controller.js";
import { DidTimestampsService } from "./did-timestamps.service.js";
import { LedgerService } from "../ledger/ledger.service.js";

@Module({
  imports: [ApiConfigModule],
  controllers: [DidTimestampsController],
  providers: [Logger, DidTimestampsService, LedgerService],
})
export class DidTimestampsModule {}

export default DidTimestampsModule;
