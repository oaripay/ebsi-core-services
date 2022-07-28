import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import LedgerService from "./ledger.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [],
  providers: [Logger, LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}

export default LedgerModule;
