import { Module, Logger } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { LedgerService } from "../ledger/ledger.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [UsersController],
  providers: [Logger, UsersService, LedgerService],
})
export class UsersModule {}

export default UsersModule;
