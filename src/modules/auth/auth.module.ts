import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { ApiConfigModule } from "../../config/configuration";
import { AuthService } from "./auth.service";
import { OAuth2JwtStrategy, SiopJwtStrategy } from "./strategies";
import { JwtCacheService } from "./jwt-cache.service";

@Module({
  imports: [ApiConfigModule, PassportModule],
  providers: [AuthService, JwtCacheService, OAuth2JwtStrategy, SiopJwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

export default AuthModule;
