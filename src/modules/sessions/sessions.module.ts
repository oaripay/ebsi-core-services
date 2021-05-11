import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiConfigModule } from "../../config/configuration";
import { SessionsController } from "./sessions.controller";
import SessionsService from "./sessions.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [SessionsController],
  providers: [ConfigService, SessionsService],
})
export class SessionsModule {}

export default SessionsModule;
