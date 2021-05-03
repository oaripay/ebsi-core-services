import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { HashAlgorithmsController } from "./hash-algorithms.controller";
import { HashAlgorithmsService } from "./hash-algorithms.service";
import { LedgerService } from "../ledger/ledger.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [HashAlgorithmsController],
  providers: [Logger, HashAlgorithmsService, LedgerService],
})
export class HashAlgorithmsModule {}

export default HashAlgorithmsModule;
