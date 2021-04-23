import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiConfigModule } from "../../config/configuration";
import { AuthenticationController } from "./authentication.controller";
import AuthenticationService from "./authentication.service";

@Module({
  imports: [ApiConfigModule],
  controllers: [AuthenticationController],
  providers: [ConfigService, AuthenticationService],
})
export class AuthenticationModule {}

export default AuthenticationModule;
