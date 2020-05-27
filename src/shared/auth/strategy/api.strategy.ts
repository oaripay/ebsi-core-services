import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { Strategy } from "passport-http-bearer";
import { StrategyType } from "./constants";
import { AppService } from "../../services/app.service";
import { EthersService } from "../../services/ethers.service";

@Injectable()
export class ApiStrategy extends PassportStrategy(Strategy, StrategyType.API) {
  constructor(
    private joseService: AppService,
    private ethersService: EthersService
  ) {
    super();
  }

  async validate(token: string, done: any) {
    try {
      const decodedBodyToken: any = this.joseService.decode(token);

      const appPublicKey = await this.ethersService.getApplicationPublicKey(
        decodedBodyToken.appName
      );
      const key = AppService.asKey(AppService.base64Buffer(appPublicKey));
      this.joseService.verify(token, key);
      done(null, true);
    } catch (ex) {
      throw new UnauthorizedException();
    }
  }
}

export default ApiStrategy;
