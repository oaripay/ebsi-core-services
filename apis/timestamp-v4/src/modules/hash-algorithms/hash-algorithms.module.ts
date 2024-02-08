import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import { HashAlgorithmsController } from "./hash-algorithms.controller.js";
import { HashAlgorithmsService } from "./hash-algorithms.service.js";
import { LedgerModule } from "../ledger/ledger.module.js";

@Module({
  imports: [ApiConfigModule, LedgerModule],
  controllers: [HashAlgorithmsController],
  providers: [Logger, HashAlgorithmsService],
})
export class HashAlgorithmsModule {}

export default HashAlgorithmsModule;
