import { Logger, Module } from "@nestjs/common";

import { ApiConfigModule } from "../../config/configuration.js";
import { LedgerModule } from "../ledger/ledger.module.js";
import { PoliciesController } from "./policies.controller.js";
import { PoliciesService } from "./policies.service.js";

@Module({
  controllers: [PoliciesController],
  imports: [ApiConfigModule, LedgerModule],
  providers: [Logger, PoliciesService],
})
export class PoliciesModule {}

export default PoliciesModule;
