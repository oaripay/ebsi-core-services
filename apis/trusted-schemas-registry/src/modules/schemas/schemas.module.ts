import { Logger, Module } from "@nestjs/common";

import { ApiConfigModule } from "../../config/configuration.js";
import { LedgerModule } from "../ledger/ledger.module.js";
import { SchemasController } from "./schemas.controller.js";
import { SchemasService } from "./schemas.service.js";

@Module({
  controllers: [SchemasController],
  imports: [ApiConfigModule, LedgerModule],
  providers: [Logger, SchemasService],
})
export class SchemasModule {}

export default SchemasModule;
