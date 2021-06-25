import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import AppsController from "./apps.controller";
import AppsService from "./apps.service";
import { LedgerModule } from "../ledger/ledger.module";

@Module({
  imports: [ApiConfigModule, LedgerModule],
  controllers: [AppsController],
  providers: [Logger, AppsService],
})
export class AppsModule {}

export default AppsModule;
