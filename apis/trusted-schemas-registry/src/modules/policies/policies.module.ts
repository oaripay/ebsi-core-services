import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { PoliciesController } from "./policies.controller";
import { PoliciesService } from "./policies.service";
import { LedgerService } from "../ledger/ledger.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [PoliciesController],
  providers: [Logger, PoliciesService, LedgerService],
})
export class PoliciesModule {}

export default PoliciesModule;
