import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { decodeJWT } from "did-jwt";
import { verifyJwtTar } from "@cef-ebsi/oauth2-auth";
import { UnauthorizedError } from "@ebsiint-api/shared";
import { ApiConfig } from "../../config/configuration";
import { JwtCacheService } from "./jwt-cache.service";
import { JWTDecoded, Payload } from "./auth.interface";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private trustedAppsRegistryV3: string;

  private trustedAppsRegistryV4: string;

  private authorisationApiName: string;

  private timeout: number;

  constructor(
    private cache: JwtCacheService,
    configService: ConfigService<ApiConfig, true>
  ) {
    this.authorisationApiName = configService.get<string>(
      "authorisationApiName"
    );
    this.trustedAppsRegistryV3 = `${configService.get<string>(
      "trustedAppsRegistryApiV3Url"
    )}/apps`;
    this.trustedAppsRegistryV4 = `${configService.get<string>(
      "trustedAppsRegistryApiV4Url"
    )}/apps`;
    this.timeout = configService.get<number>("requestTimeout");
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

      const { header, payload } = decodeJWT(token) as unknown as JWTDecoded;

      if (payload.login_hint === "did_siop") {
        throw new Error(
          "This jsonrpc method is restricted to Trusted Apps authorized to use Ledger API"
        );
      }

      if (header.kid.startsWith(this.trustedAppsRegistryV4)) {
        await verifyJwtTar(token, {
          trustedAppsRegistry: this.trustedAppsRegistryV4,
          op: this.authorisationApiName,
          timeout: this.timeout,
        });
      } else {
        await verifyJwtTar(token, {
          trustedAppsRegistry: this.trustedAppsRegistryV3,
          op: this.authorisationApiName,
          timeout: this.timeout,
        });
      }

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
