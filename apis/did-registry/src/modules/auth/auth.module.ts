import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { ApiConfigModule } from "../../config/configuration.js";
import { AuthService } from "./auth.service.js";
import {
  OAuth2JwtStrategy,
  OAuth2OrSiopJwtStrategy,
  SiopJwtStrategy,
} from "./strategies/index.js";

@Module({
  imports: [ApiConfigModule, PassportModule],
  providers: [
    AuthService,
    OAuth2JwtStrategy,
    OAuth2OrSiopJwtStrategy,
    SiopJwtStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}

export default AuthModule;
