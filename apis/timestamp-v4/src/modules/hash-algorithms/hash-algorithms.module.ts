import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import { HashAlgorithmsController } from "./hash-algorithms.controller.js";
import { HashAlgorithmsService } from "./hash-algorithms.service.js";
import { LedgerService } from "../ledger/ledger.service.js";

@Module({
  imports: [ApiConfigModule],
  controllers: [HashAlgorithmsController],
  providers: [Logger, HashAlgorithmsService, LedgerService],
})
export class HashAlgorithmsModule {}

export default HashAlgorithmsModule;
