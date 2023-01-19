import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JWTPayload, decodeJWT } from "did-jwt";
import { verifyJwtTar as verifyOAuth2Token } from "@cef-ebsi/oauth2-auth";
import { verifyJwtTar as verifySiopToken } from "@cef-ebsi/siop-auth";
import { UnauthorizedError } from "@ebsiint-api/shared";
import { AppInfo, ClientInfo, SubjectInfo } from "./auth.interface";
import { ApiConfig } from "../../config/configuration";

@Injectable()
export class AuthService {
  private authorisationApiName: string;

  private trustedAppsRegistry: string;

  private timeout: number;

  constructor(configService: ConfigService<ApiConfig, true>) {
    this.authorisationApiName = configService.get<string>(
      "authorisationApiName"
    );

    this.trustedAppsRegistry = `${configService.get<string>(
      "trustedAppsRegistryApiUrl"
    )}/apps`;

    this.timeout = configService.get<number>("requestTimeout");
  }

  async validateToken(bearerToken: string): Promise<SubjectInfo> {
    let payload: JWTPayload;
    try {
      payload = decodeJWT(bearerToken).payload;
    } catch (error) {
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: `Invalid Authorisation Token: ${(error as Error).message}`,
      });
    }

    const { sub } = payload;

    if (!sub) {
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: "Invalid JWT: empty or missing sub",
      });
    }

    if (payload.login_hint && payload.login_hint === "did_siop") {
      await this.validateSiopToken(bearerToken);
    } else {
      await this.validateOAuth2Token(bearerToken);
    }

    return { sub };
  }

  async validateOAuth2Token(bearerToken: string): Promise<AppInfo> {
    // Verify access token with @cef-ebsi/oauth2-auth
    let payload: JWTPayload;

    try {
      payload = (
        await verifyOAuth2Token(bearerToken, {
          trustedAppsRegistry: this.trustedAppsRegistry,
          op: this.authorisationApiName,
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

    // Populate "appInfo" object
    return { name: payload.sub };
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
