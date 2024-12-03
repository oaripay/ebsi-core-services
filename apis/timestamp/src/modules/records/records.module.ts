import { Logger, Module } from "@nestjs/common";

import { ApiConfigModule } from "../../config/configuration.js";
import { LedgerModule } from "../ledger/ledger.module.js";
import RecordsController from "./records.controller.js";
import RecordsService from "./records.service.js";

@Module({
  controllers: [RecordsController],
  imports: [ApiConfigModule, LedgerModule],
  providers: [Logger, RecordsService],
})
export class RecordsModule {}

export default RecordsModule;
