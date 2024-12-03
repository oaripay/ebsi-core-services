import { Logger, Module } from "@nestjs/common";

import { ApiConfigModule } from "../../config/configuration.js";
import { LedgerModule } from "../ledger/ledger.module.js";
import { IssuersController } from "./issuers.controller.js";
import { IssuersService } from "./issuers.service.js";

@Module({
  controllers: [IssuersController],
  imports: [ApiConfigModule, LedgerModule],
  providers: [Logger, IssuersService],
})
export class IssuersModule {}

export default IssuersModule;
