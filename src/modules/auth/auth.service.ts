import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { decodeJWT, JWTPayload } from "did-jwt";
import { verifyJwtTar as verifyOAuth2Token } from "@cef-ebsi/oauth2-auth";
import { verifyJwtTar as verifySiopToken } from "@cef-ebsi/siop-auth";
import { UnauthorizedError } from "@cef-ebsi/problem-details-errors";
import { AppInfo, ClientInfo } from "./auth.interface";
import { ApiConfig } from "../../config/configuration";
import { JwtCacheService } from "./jwt-cache.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private authorisationApiName: string;

  private trustedAppsRegistry: string;

  private timeout: number;

  constructor(
    private cache: JwtCacheService,
    configService: ConfigService<ApiConfig>
  ) {
    this.authorisationApiName = configService.get<string>(
      "authorisationApiName"
    );

    this.trustedAppsRegistry = `${configService.get<string>(
      "trustedAppsRegistryApiUrl"
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
    const cacheableRequestHosts = ["localhost", "127.0.0.1", "api.local"];
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

  // Verify access token with @cef-ebsi/oauth2-auth
  async validateOAuth2Token(
    bearerToken: string,
    requestHost?: string
  ): Promise<AppInfo> {
    const now = Math.floor(Date.now() / 1000);

    // Regularly run maintenance operations (like clearing the cache)
    this.cache.doctor(now);

    if (this.cache.isValid(bearerToken, now)) {
      this.logger.debug(`Reusing cached token: ${bearerToken}`);
      const { payload } = decodeJWT(bearerToken);
      return { name: payload.sub };
    }

    try {
      this.logger.debug(`Verifying token: ${bearerToken}`);
      const { payload } = await verifyOAuth2Token(bearerToken, {
        trustedAppsRegistry: this.trustedAppsRegistry,
        op: this.authorisationApiName,
        timeout: this.timeout,
      });

      // Try to store valid JWT in cache
      this.storeJwt(bearerToken, now, payload.exp, requestHost);

      return { name: payload.sub };
    } catch (e) {
      let message = "unkown error";

      if (e instanceof Error) {
        message = e.message;
      }

      this.logger.debug(`Invalid token: ${bearerToken}`);
      this.logger.debug(e);
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: `Invalid JWT: ${message}`,
      });
    }
  }

  // Verify access token with @cef-ebsi/siop-auth
  async validateSiopToken(bearerToken: string): Promise<ClientInfo> {
    let payload: JWTPayload;

    try {
      payload = (
        await verifySiopToken(bearerToken, {
          trustedAppsRegistry: this.trustedAppsRegistry,
          audience: "ebsi-core-services",
          timeout: this.timeout,
        })
      ).payload;
    } catch (e) {
      let message = "unkown error";

      if (e instanceof Error) {
        message = e.message;
      }

      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: `Invalid JWT: ${message}`,
      });
    }

    if (!payload.sub) {
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: "Invalid JWT: missing sub",
      });
    }

    // Populate "clientInfo" object
    return { did: payload.sub };
  }
}

export default AuthService;
