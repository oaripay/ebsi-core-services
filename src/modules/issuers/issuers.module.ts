import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { IssuersController } from "./issuers.controller";
import { IssuersService } from "./issuers.service";
import LedgerService from "../../shared/services/ledger.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [IssuersController],
  providers: [Logger, IssuersService, LedgerService],
})
export class IssuersModule {}

export default IssuersModule;
