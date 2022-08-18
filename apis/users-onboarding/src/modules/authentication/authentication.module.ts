import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiConfigModule } from "../../config/configuration";
import { AuthModule } from "../auth/auth.module";
import { AuthenticationController } from "./authentication.controller";
import AuthenticationService from "./authentication.service";

@Module({
  imports: [ApiConfigModule, AuthModule],
  controllers: [AuthenticationController],
  providers: [ConfigService, AuthenticationService],
})
export class AuthenticationModule {}

export default AuthenticationModule;
