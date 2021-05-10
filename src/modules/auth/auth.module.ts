import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { ApiConfigModule } from "../../config/configuration";
import { AuthService } from "./auth.service";
import { SiopJwtStrategy } from "./strategies";

@Module({
  imports: [ApiConfigModule, PassportModule],
  providers: [AuthService, SiopJwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

export default AuthModule;
