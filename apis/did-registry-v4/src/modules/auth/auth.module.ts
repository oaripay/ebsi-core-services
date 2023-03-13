import { CacheModule, Module, Logger } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { ApiConfigModule } from "../../config/configuration";
import { AuthService } from "./auth.service";
import { BearerJwtStrategy } from "./strategies";

@Module({
  imports: [ApiConfigModule, CacheModule.register(), PassportModule],
  providers: [Logger, AuthService, BearerJwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

export default AuthModule;
