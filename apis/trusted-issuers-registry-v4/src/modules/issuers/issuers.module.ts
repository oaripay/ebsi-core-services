import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import { IssuersController } from "./issuers.controller.js";
import { IssuersService } from "./issuers.service.js";
import { LedgerService } from "../ledger/ledger.service.js";

@Module({
  imports: [ApiConfigModule],
  controllers: [IssuersController],
  providers: [Logger, IssuersService, LedgerService],
})
export class IssuersModule {}

export default IssuersModule;
