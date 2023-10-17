import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import RecordsController from "./records.controller.js";
import RecordsService from "./records.service.js";
import { LedgerService } from "../ledger/ledger.service.js";

@Module({
  imports: [ApiConfigModule],
  controllers: [RecordsController],
  providers: [Logger, RecordsService, LedgerService],
})
export class RecordsModule {}

export default RecordsModule;
