import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { JWTPayload } from "did-jwt";
import { verifyJwtTar } from "@cef-ebsi/siop-auth";
import { UnauthorizedError } from "@ebsiint-api/shared";
import { ClientInfo } from "./auth.interface.js";
import type { ApiConfig } from "../../config/configuration.js";

@Injectable()
export class AuthService {
  private tarAppsRegistry: string;

  private timeout: number;

  constructor(configService: ConfigService<ApiConfig, true>) {
    this.tarAppsRegistry = `${configService.get<string>(
      "domain",
    )}${configService.get<string>("apiUrlPrefix")}/apps`;
    this.timeout = configService.get<number>("requestTimeout");
  }

  async validateSiopToken(bearerToken: string): Promise<ClientInfo> {
    // Verify access token with @cef-ebsi/siop-auth
    let payload: JWTPayload;

    try {
      const verifiedJwt = await verifyJwtTar(bearerToken, {
        trustedAppsRegistry: this.tarAppsRegistry,
        audience: "ebsi-core-services",
        timeout: this.timeout,
      });
      payload = verifiedJwt.payload;
    } catch (e) {
      let message = "unknown error";

      if (e instanceof Error) {
        message = e.message;
      }

      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: `Invalid JWT: ${message}`,
      });
    }

    // Populate "clientInfo" object
    return { did: payload.sub! };
  }
}

export default AuthService;
