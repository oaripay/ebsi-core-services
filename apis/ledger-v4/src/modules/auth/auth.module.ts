import { Module } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import { AuthService } from "./auth.service.js";
import { JwtCacheService } from "./jwt-cache.service.js";

@Module({
  imports: [ApiConfigModule],
  providers: [AuthService, JwtCacheService],
  exports: [AuthService],
})
export class AuthModule {}

export default AuthModule;
