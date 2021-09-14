import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import AdministratorsController from "./administrators.controller";
import { AdministratorsService } from "./administrators.service";
import { AuthModule } from "../auth/auth.module";
import { LedgerService } from "../ledger/ledger.service";

@Module({
  imports: [ApiConfigModule, AuthModule],
  controllers: [AdministratorsController],
  providers: [Logger, AdministratorsService, LedgerService],
})
export class AdministratorsModule {}

export default AdministratorsModule;
