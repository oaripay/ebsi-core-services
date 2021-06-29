import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { decodeJWT } from "@cef-ebsi/did-jwt";
import { JWTPayload, Session } from "@cef-ebsi/oauth2-auth";
import { UnauthorizedError } from "@cef-ebsi/problem-details-errors";
import { ApiConfig } from "../../config/configuration";
import { JwtCacheService } from "./jwt-cache.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private authApiName: string;

  private session: Session;

  constructor(
    private cache: JwtCacheService,
    configService: ConfigService<ApiConfig>
  ) {
    this.authApiName = configService.get<string>("authApiName");
    this.session = new Session("undefined", {
      appName: configService.get<string>("apiName"),
      tarProvider: configService.get<string>("trustedAppsRegistry"),
    });
  }

  storeJwt(
    token: string,
    now: number,
    exp?: number,
    requestHost?: string
  ): void {
    // Cache requests targeting these hosts
    const cacheableRequestHosts = [
      "localhost",
      "127.0.0.1",
      "api.local",
      "0.0.0.0",
    ];
    this.logger.debug(
      `Checking if the API should store the JWT. requestHost: ${requestHost}`
    );
    if (
      requestHost &&
      cacheableRequestHosts.find((host) => requestHost.includes(host))
    ) {
      this.cache.safeAdd(token, now, exp);
    }
  }

  async validateToken(
    token: string,
    requestHost?: string
  ): Promise<JWTPayload> {
    const now = Math.floor(Date.now() / 1000);

    // Regularly run maintenance operations (like clearing the cache)
    this.cache.doctor(now);

    if (this.cache.isValid(token, now)) {
      this.logger.debug(`Reusing cached token: ${token}`);
      return decodeJWT(token).payload as JWTPayload;
    }

    try {
      this.logger.debug(`Verifying token: ${token}`);
      const payload = await this.session.verifyAccessToken(
        token,
        this.authApiName
      );

      // Try to store valid JWT in cache
      this.storeJwt(token, now, payload.exp, requestHost);

      return payload;
    } catch (error) {
      this.logger.debug(`Invalid token: ${token}`);
      this.logger.debug(error);
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: (error as Error).message,
      });
    }
  }
}

export default AuthService;
