import { Strategy } from "passport-http-bearer";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AuthService } from "../auth.service";
import { AppInfo } from "../auth.interface";

@Injectable()
export class OAuth2JwtStrategy extends PassportStrategy(
  Strategy,
  "oauth2-jwt"
) {
  constructor(private authService: AuthService) {
    super({ passReqToCallback: true });
  }

  async validate(
    request: FastifyRequest,
    bearerToken: string
  ): Promise<AppInfo> {
    return this.authService.validateOAuth2Token(
      bearerToken,
      request?.headers?.host
    );
  }
}

export default OAuth2JwtStrategy;
