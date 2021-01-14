import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import AppsController from "./apps.controller";
import AppsService from "./apps.service";
import LedgerService from "../../shared/services/ledger.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [AppsController],
  providers: [Logger, AppsService, LedgerService],
})
export class AppsModule {}

export default AppsModule;
