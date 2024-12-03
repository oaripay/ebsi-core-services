import { Logger, Module } from "@nestjs/common";

import { ApiConfigModule } from "../../config/configuration.js";
import { LedgerModule } from "../ledger/ledger.module.js";
import { HashAlgorithmsController } from "./hash-algorithms.controller.js";
import { HashAlgorithmsService } from "./hash-algorithms.service.js";

@Module({
  controllers: [HashAlgorithmsController],
  imports: [ApiConfigModule, LedgerModule],
  providers: [Logger, HashAlgorithmsService],
})
export class HashAlgorithmsModule {}

export default HashAlgorithmsModule;
