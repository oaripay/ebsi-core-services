import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import DidMethodsController from "./did-methods.controller";
import DidMethodsService from "./did-methods.service";
import { LedgerService } from "../ledger/ledger.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [DidMethodsController],
  providers: [Logger, DidMethodsService, LedgerService],
})
export class DidMethodsModule {}

export default DidMethodsModule;
