import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import { SchemasController } from "./schemas.controller.js";
import { SchemasService } from "./schemas.service.js";
import { LedgerModule } from "../ledger/ledger.module.js";

@Module({
  imports: [ApiConfigModule, LedgerModule],
  controllers: [SchemasController],
  providers: [Logger, SchemasService],
})
export class SchemasModule {}

export default SchemasModule;
