import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { ApiStrategy } from "./strategy/api.strategy";
import { EthersService } from "../services/ethers.service";
import { AppService } from "../services/app.service";

@Module({
  imports: [PassportModule],
  providers: [ApiStrategy, EthersService, AppService],
})
export class AuthModule {}

export default AuthModule;
