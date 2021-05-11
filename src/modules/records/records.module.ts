import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import RecordsController from "./records.controller";
import RecordsService from "./records.service";
import { LedgerService } from "../../shared/services/ledger.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [RecordsController],
  providers: [Logger, RecordsService, LedgerService],
})
export class RecordsModule {}

export default RecordsModule;
