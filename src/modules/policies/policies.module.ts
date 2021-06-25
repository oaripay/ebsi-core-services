import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import PoliciesController from "./policies.controller";
import PoliciesService from "./policies.service";
import { LedgerModule } from "../ledger/ledger.module";

@Module({
  imports: [ApiConfigModule, LedgerModule],
  controllers: [PoliciesController],
  providers: [Logger, PoliciesService],
})
export class PoliciesModule {}

export default PoliciesModule;
