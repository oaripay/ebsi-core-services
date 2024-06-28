import { Module, Logger } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { PassportModule } from "@nestjs/passport";
import { ApiConfigModule } from "../../config/configuration.js";
import { AuthService } from "./auth.service.js";
import { BearerJwtStrategy } from "./strategies/index.js";

@Module({
  imports: [ApiConfigModule, CacheModule.register(), PassportModule],
  providers: [Logger, AuthService, BearerJwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

export default AuthModule;
