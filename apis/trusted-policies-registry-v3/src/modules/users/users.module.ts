import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";
import { LedgerModule } from "../ledger/ledger.module.js";

@Module({
  imports: [ApiConfigModule, LedgerModule],
  controllers: [UsersController],
  providers: [Logger, UsersService],
})
export class UsersModule {}

export default UsersModule;
