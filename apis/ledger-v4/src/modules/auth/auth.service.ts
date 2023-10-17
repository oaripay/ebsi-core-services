import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { decodeJWT } from "did-jwt";
import { verifyJwtTar } from "@cef-ebsi/oauth2-auth";
import { UnauthorizedError } from "@ebsiint-api/shared";
import type { ApiConfig } from "../../config/configuration.js";
import { JwtCacheService } from "./jwt-cache.service.js";
import { JWTDecoded, Payload } from "./auth.interface.js";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private trustedAppsRegistry: string;

  private authorisationApiName: string;

  private timeout: number;

  constructor(
    private cache: JwtCacheService,
    configService: ConfigService<ApiConfig, true>,
  ) {
    this.authorisationApiName = configService.get<string>(
      "authorisationApiName",
    );
    this.trustedAppsRegistry = `${configService.get<string>(
      "trustedAppsRegistryApiUrl",
    )}/apps`;
    this.timeout = configService.get<number>("requestTimeout");
  }

  storeJwt(
    token: string,
    now: number,
    exp?: number,
    requestHost?: string,
  ): void {
    // Cache requests targeting these hosts
    const cacheableRequestHosts = [
      "localhost",
      "127.0.0.1",
      "api.local",
      "0.0.0.0",
    ];
    this.logger.debug(
      `Checking if the API should store the JWT. requestHost: ${requestHost}`,
    );
    if (
      requestHost &&
      cacheableRequestHosts.find((host) => requestHost.includes(host))
    ) {
      this.cache.safeAdd(token, now, exp);
    }
  }

  async validateToken(token: string, requestHost?: string): Promise<Payload> {
    const now = Math.floor(Date.now() / 1000);

    // Regularly run maintenance operations (like clearing the cache)
    this.cache.doctor(now);

    if (this.cache.isValid(token, now)) {
      this.logger.debug(`Reusing cached token: ${token}`);
      return decodeJWT(token).payload as Payload;
    }

    try {
      this.logger.debug(`Verifying token: ${token}`);

      await verifyJwtTar(token, {
        trustedAppsRegistry: this.trustedAppsRegistry,
        op: this.authorisationApiName,
        timeout: this.timeout,
      });

      // Try to store valid JWT in cache
      const { payload } = decodeJWT(token) as unknown as JWTDecoded;
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
