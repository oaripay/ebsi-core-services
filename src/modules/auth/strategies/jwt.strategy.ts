import { ExtractJwt, Strategy, StrategyOptions } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";
import { UnauthorizedError } from "@cef-ebsi/problem-details-errors";
import { AuthService } from "../auth.service";
import { JwtPayload, UserInfo } from "../auth.interface";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: "secret",
      issuer: "authorization-api",
      audience: "storage-api",
    } as StrategyOptions);
  }

  async validate(payload: JwtPayload): Promise<UserInfo> {
    const user = await this.authService.validateToken(payload);

    if (!user) {
      throw new UnauthorizedError();
    }

    return user;
  }
}

export default JwtStrategy;
