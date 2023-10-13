import { CacheModule, Module } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import { AuthService } from "./auth.service";
import { BearerJwtStrategy } from "./strategies";

@Module({
  imports: [ApiConfigModule, CacheModule.register()],
  providers: [AuthService, BearerJwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

export default AuthModule;
