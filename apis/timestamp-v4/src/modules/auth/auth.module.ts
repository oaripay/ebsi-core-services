import { CacheModule } from "@nestjs/cache-manager";
import { Module } from "@nestjs/common";

import { ApiConfigModule } from "../../config/configuration.js";
import { AuthService } from "./auth.service.js";
import { BearerJwtStrategy } from "./strategies/index.js";

@Module({
  exports: [AuthService],
  imports: [ApiConfigModule, CacheModule.register()],
  providers: [AuthService, BearerJwtStrategy],
})
export class AuthModule {}

export default AuthModule;
