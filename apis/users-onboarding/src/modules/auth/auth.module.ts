import { Module } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration";
import AuthService from "./auth.service";

@Module({
  imports: [ApiConfigModule],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}

export default AuthModule;
