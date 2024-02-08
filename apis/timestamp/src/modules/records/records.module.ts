import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import RecordsController from "./records.controller.js";
import RecordsService from "./records.service.js";
import { LedgerModule } from "../ledger/ledger.module.js";

@Module({
  imports: [ApiConfigModule, LedgerModule],
  controllers: [RecordsController],
  providers: [Logger, RecordsService],
})
export class RecordsModule {}

export default RecordsModule;
