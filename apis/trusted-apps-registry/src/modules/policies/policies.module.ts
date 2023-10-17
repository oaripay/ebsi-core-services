import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import PoliciesController from "./policies.controller.js";
import PoliciesService from "./policies.service.js";
import { LedgerModule } from "../ledger/ledger.module.js";

@Module({
  imports: [ApiConfigModule, LedgerModule],
  controllers: [PoliciesController],
  providers: [Logger, PoliciesService],
})
export class PoliciesModule {}

export default PoliciesModule;
