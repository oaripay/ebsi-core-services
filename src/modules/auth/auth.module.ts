import { Module } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { AuthService } from "./auth.service";
import { JwtCacheService } from "./jwt-cache.service";

@Module({
  imports: [ApiConfigModule],
  providers: [AuthService, JwtCacheService],
  exports: [AuthService],
})
export class AuthModule {}

export default AuthModule;
