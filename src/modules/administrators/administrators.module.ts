import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { AdministratorsController } from "./administrators.controller";
import { AdministratorsService } from "./administrators.service";
import LedgerService from "../../shared/services/ledger.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [AdministratorsController],
  providers: [Logger, AdministratorsService, LedgerService],
})
export class AdministratorsModule {}

export default AdministratorsModule;
