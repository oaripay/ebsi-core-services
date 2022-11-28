import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { SchemasController } from "./schemas.controller";
import { SchemasService } from "./schemas.service";
import { ContractService } from "../contract/contract.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [SchemasController],
  providers: [Logger, ContractService, SchemasService],
})
export class SchemasModule {}

export default SchemasModule;
