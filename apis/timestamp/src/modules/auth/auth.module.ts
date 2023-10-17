import { Module } from "@nestjs/common";
import { ApiConfigModule } from "../../config/configuration.js";
import { AuthService } from "./auth.service.js";

@Module({
  imports: [ApiConfigModule],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}

export default AuthModule;
