import { Module } from "@nestjs/common";

import { ApiConfigModule } from "../../config/configuration.js";
import { LedgerService } from "./ledger.service.js";

@Module({
  exports: [LedgerService],
  imports: [ApiConfigModule],
  providers: [LedgerService],
})
export class LedgerModule {}

export default LedgerModule;
