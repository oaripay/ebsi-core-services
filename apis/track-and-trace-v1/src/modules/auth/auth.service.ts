import { Inject, Injectable, Logger } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { ConfigService } from "@nestjs/config";
import { importJWK, decodeJwt, decodeProtectedHeader, jwtVerify } from "jose";
import type {
  JSONWebKeySet,
  ProtectedHeaderParameters,
  JWTPayload,
} from "jose";
import axios from "axios";
import type { AxiosResponse } from "axios";
import {
  logAxiosError,
  InternalServerError,
  UnauthorizedError,
} from "@ebsiint-api/shared";
import type { Cache } from "cache-manager";
import type { SubjectInfo } from "./auth.interface.js";
import type { ApiConfig } from "../../config/configuration.js";
import { openidConfigurationSchema } from "./validators/openid-configuration.validator.js";
import { jwksSchema } from "./validators/jwks.validator.js";

const CACHE_KEY = "jwks";
const CACHE_TTL = 300_000; // 5 minutes

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly timeout: number;

  private readonly authorisationApiUrl: string;

  constructor(
    configService: ConfigService<ApiConfig, true>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.timeout = configService.get<number>("requestTimeout");
    this.authorisationApiUrl = configService.get<string>("authorisationApiUrl");
  }

  private async getAuthorisationApiJwk(kid: string) {
    let jwks = await this.cacheManager.get<JSONWebKeySet>(CACHE_KEY);

    if (!jwks) {
      let rawAuthApiOpenIdConfig: AxiosResponse<unknown>;
      try {
        rawAuthApiOpenIdConfig = await axios.get<unknown>(
          `${this.authorisationApiUrl}/.well-known/openid-configuration`,
          {
            timeout: this.timeout,
          },
        );
      } catch (err) {
        if (err instanceof Error) {
          if (axios.isAxiosError(err)) {
            logAxiosError(err, this.logger);
          } else {
            this.logger.error(err.message, err.stack);
          }
        } else {
          this.logger.error(err);
        }

        throw new InternalServerError(InternalServerError.defaultTitle, {
          detail: "Couldn't get Authorisation API OpenID Configuration",
        });
      }

      const parsedAuthApiOpenIdConfig = openidConfigurationSchema.safeParse(
        rawAuthApiOpenIdConfig.data,
      );

      if (!parsedAuthApiOpenIdConfig.success) {
        throw new InternalServerError(InternalServerError.defaultTitle, {
          detail:
            "Authorisation API didn't respond as expected (invalid OpenID Configuration)",
        });
      }

      const { jwks_uri: jwksUri } = parsedAuthApiOpenIdConfig.data;

      let rawAuthApiJwks: AxiosResponse<unknown>;

      try {
        rawAuthApiJwks = await axios.get<unknown>(jwksUri, {
          timeout: this.timeout,
        });
      } catch (err) {
        if (err instanceof Error) {
          if (axios.isAxiosError(err)) {
            logAxiosError(err, this.logger);
          } else {
            this.logger.error(err.message, err.stack);
          }
        } else {
          this.logger.error(err);
        }

        throw new InternalServerError(InternalServerError.defaultTitle, {
          detail: "Couldn't get Authorisation API JWKS",
        });
      }

      const parsedAuthApiJwks = jwksSchema.safeParse(rawAuthApiJwks.data);

      if (!parsedAuthApiJwks.success) {
        throw new InternalServerError(InternalServerError.defaultTitle, {
          detail: "Authorisation API didn't respond as expected (invalid JWKS)",
        });
      }

      jwks = parsedAuthApiJwks.data as JSONWebKeySet;

      // Store result in cache
      await this.cacheManager.set(CACHE_KEY, jwks, CACHE_TTL);
    }

    return jwks.keys.find((key) => key.kid === kid);
  }

  async validateToken(bearerToken: string): Promise<SubjectInfo> {
    let jwtHeader: ProtectedHeaderParameters;
    let payload: JWTPayload;
    try {
      payload = decodeJwt(bearerToken);
      jwtHeader = decodeProtectedHeader(bearerToken);
    } catch (error) {
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: `Invalid Authorisation Token: ${(error as Error).message}`,
      });
    }

    // Verify that the access token has been issued by Authorisation API v3
    const { kid } = jwtHeader;
    if (!kid || typeof kid !== "string") {
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: "Invalid JWT: empty or missing kid",
      });
    }

    const authApiPublicKeyJwk = await this.getAuthorisationApiJwk(kid);
    if (!authApiPublicKeyJwk) {
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail:
          "Invalid Access Token. Couldn't find a public key related to the given kid.",
      });
    }

    try {
      await jwtVerify(bearerToken, await importJWK(authApiPublicKeyJwk));
    } catch {
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: "Access Token signature validation failed",
      });
    }

    // We only validate "sub" and "scp" (the only properties we need later)
    const { sub, scp } = payload;

    if (!sub) {
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: "Invalid JWT: empty or missing sub",
      });
    }

    if (!scp || typeof scp !== "string") {
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: "Invalid JWT: empty or missing scp",
      });
    }

    // The Access Token `scp` must contain one of the valid scopes.
    const validScopes = ["tnt_authorise", "tnt_create", "tnt_write"] as const;
    if (!validScopes.some((s) => scp.includes(s))) {
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail:
          "Invalid JWT: scp must contain tnt_authorise, tnt_create or tnt_write",
      });
    }

    return { sub, scp };
  }
}

export default AuthService;
