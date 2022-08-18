import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import IdentifiersController from "./identifiers.controller";
import IdentifiersService from "./identifiers.service";
import { LedgerService } from "../ledger/ledger.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [IdentifiersController],
  providers: [Logger, IdentifiersService, LedgerService],
})
export class IdentifiersModule {}

export default IdentifiersModule;
