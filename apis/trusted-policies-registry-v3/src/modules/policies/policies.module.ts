import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import { PoliciesController } from "./policies.controller.js";
import { PoliciesService } from "./policies.service.js";
import { LedgerService } from "../ledger/ledger.service.js";

@Module({
  imports: [ApiConfigModule],
  controllers: [PoliciesController],
  providers: [Logger, PoliciesService, LedgerService],
})
export class PoliciesModule {}

export default PoliciesModule;
