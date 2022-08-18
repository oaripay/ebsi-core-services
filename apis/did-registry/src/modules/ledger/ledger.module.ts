import { Module } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { LedgerService } from "./ledger.service";

@Module({
  imports: [ApiConfigModule],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}

export default LedgerModule;
