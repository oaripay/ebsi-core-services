import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { DidTimestampsController } from "./did-timestamps.controller";
import { DidTimestampsService } from "./did-timestamps.service";
import { LedgerService } from "../ledger/ledger.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [DidTimestampsController],
  providers: [Logger, DidTimestampsService, LedgerService],
})
export class DidTimestampsModule {}

export default DidTimestampsModule;
