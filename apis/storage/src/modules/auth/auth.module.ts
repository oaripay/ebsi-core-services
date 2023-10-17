import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { ApiConfigModule } from "../../config/configuration.js";
import { AuthService } from "./auth.service.js";
import { OAuth2JwtStrategy, SiopJwtStrategy } from "./strategies/index.js";
import { JwtCacheService } from "./jwt-cache.service.js";

@Module({
  imports: [ApiConfigModule, PassportModule],
  providers: [AuthService, JwtCacheService, OAuth2JwtStrategy, SiopJwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

export default AuthModule;
