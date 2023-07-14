import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JWTPayload } from "did-jwt";
import { verifyJwtTar as verifySiopToken } from "@cef-ebsi/siop-auth";
import { UnauthorizedError } from "@ebsiint-api/shared";
import { ClientInfo } from "./auth.interface";
import { ApiConfig } from "../../config/configuration";

@Injectable()
export class AuthService {
  private trustedAppsRegistry: string;

  private timeout: number;

  constructor(configService: ConfigService<ApiConfig, true>) {
    this.trustedAppsRegistry = `${configService.get<string>(
      "trustedAppsRegistryApiUrl"
    )}/apps`;
    this.timeout = configService.get<number>("requestTimeout");
  }

  async validateSiopToken(bearerToken: string): Promise<ClientInfo> {
    // Verify access token with @cef-ebsi/siop-auth
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
      let message = "unknown error";

      if (e instanceof Error) {
        message = e.message;
      }

      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: `Invalid JWT: ${message}`,
      });
    }

    // Populate "clientInfo" object
    return { did: payload.sub };
  }
}

export default AuthService;
