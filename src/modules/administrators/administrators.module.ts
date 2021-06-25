import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import AdministratorsController from "./administrators.controller";
import AdministratorsService from "./administrators.service";
import { LedgerModule } from "../ledger/ledger.module";

@Module({
  imports: [ApiConfigModule, LedgerModule],
  controllers: [AdministratorsController],
  providers: [Logger, AdministratorsService],
})
export class AdministratorsModule {}

export default AdministratorsModule;
