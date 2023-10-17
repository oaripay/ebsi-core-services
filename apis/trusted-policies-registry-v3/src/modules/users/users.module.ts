import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";
import { LedgerService } from "../ledger/ledger.service.js";

@Module({
  imports: [ApiConfigModule],
  controllers: [UsersController],
  providers: [Logger, UsersService, LedgerService],
})
export class UsersModule {}

export default UsersModule;
