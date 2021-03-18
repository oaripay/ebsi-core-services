import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import AdministratorsController from "./administrators.controller";
import AdministratorsService from "./administrators.service";
import { ContractService } from "../../shared/services/contract.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [AdministratorsController],
  providers: [Logger, AdministratorsService, ContractService],
})
export class AdministratorsModule {}

export default AdministratorsModule;
