import { Logger, Module } from "@nestjs/common";

import { ApiConfigModule } from "../../config/configuration.js";
import { LedgerModule } from "../ledger/ledger.module.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";

@Module({
  controllers: [UsersController],
  imports: [ApiConfigModule, LedgerModule],
  providers: [Logger, UsersService],
})
export class UsersModule {}

export default UsersModule;
