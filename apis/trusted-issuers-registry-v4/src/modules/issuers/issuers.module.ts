import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import { IssuersController } from "./issuers.controller.js";
import { IssuersService } from "./issuers.service.js";
import { LedgerModule } from "../ledger/ledger.module.js";

@Module({
  imports: [ApiConfigModule, LedgerModule],
  controllers: [IssuersController],
  providers: [Logger, IssuersService],
})
export class IssuersModule {}

export default IssuersModule;
