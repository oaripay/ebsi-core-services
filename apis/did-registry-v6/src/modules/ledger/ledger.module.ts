import { Module } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import { LedgerService } from "./ledger.service.js";

@Module({
  imports: [ApiConfigModule],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}

export default LedgerModule;
