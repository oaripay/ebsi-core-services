import { Strategy } from "passport-http-bearer";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { ClientInfo } from "../auth.interface";

@Injectable()
export class SiopJwtStrategy extends PassportStrategy(Strategy, "siop-jwt") {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(bearerToken: string): Promise<ClientInfo> {
    return this.authService.validateSiopToken(bearerToken);
  }
}

export default SiopJwtStrategy;
