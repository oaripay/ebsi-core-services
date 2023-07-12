import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { SchemasController } from "./schemas.controller";
import { SchemasService } from "./schemas.service";
import { LedgerService } from "../ledger/ledger.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [SchemasController],
  providers: [Logger, LedgerService, SchemasService],
})
export class SchemasModule {}

export default SchemasModule;
