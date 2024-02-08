import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import { DidTimestampsController } from "./did-timestamps.controller.js";
import { DidTimestampsService } from "./did-timestamps.service.js";
import { LedgerModule } from "../ledger/ledger.module.js";

@Module({
  imports: [ApiConfigModule, LedgerModule],
  controllers: [DidTimestampsController],
  providers: [Logger, DidTimestampsService],
})
export class DidTimestampsModule {}

export default DidTimestampsModule;
