import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import { SchemasController } from "./schemas.controller.js";
import { SchemasService } from "./schemas.service.js";
import { LedgerService } from "../ledger/ledger.service.js";

@Module({
  imports: [ApiConfigModule],
  controllers: [SchemasController],
  providers: [Logger, LedgerService, SchemasService],
})
export class SchemasModule {}

export default SchemasModule;
