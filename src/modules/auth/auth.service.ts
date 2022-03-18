import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JWTPayload } from "did-jwt";
import { verifyJwtTar } from "@cef-ebsi/siop-auth";
import { UnauthorizedError } from "@cef-ebsi/problem-details-errors";
import { ClientInfo } from "./auth.interface";
import { ApiConfig } from "../../config/configuration";

@Injectable()
export class AuthService {
  private tarAppsRegistry: string;

  constructor(configService: ConfigService<ApiConfig>) {
    this.tarAppsRegistry = `${configService.get<string>(
      "trustedAppsRegistryUrl"
    )}/apps`;
  }

  async validateSiopToken(bearerToken: string): Promise<ClientInfo> {
    // Verify access token with @cef-ebsi/siop-auth
    let payload: JWTPayload;

    try {
      const verifiedJwt = await verifyJwtTar(bearerToken, {
        trustedAppsRegistry: this.tarAppsRegistry,
        audience: "ebsi-core-services",
      });
      payload = verifiedJwt.payload;
    } catch (e) {
      let message = "unkown error";

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
