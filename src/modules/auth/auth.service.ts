import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JWTPayload } from "@cef-ebsi/did-jwt";
import { Session as OAuth2Session } from "@cef-ebsi/oauth2-auth";
import { Session as SiopSession } from "@cef-ebsi/siop-auth";
import { UnauthorizedError } from "@cef-ebsi/problem-details-errors";
import { AppInfo, ClientInfo } from "./auth.interface";
import { ApiConfig } from "../../config/configuration";

@Injectable()
export class AuthService {
  private authorisationApiDid: string;

  private authorisationApiName: string;

  private siopSession: SiopSession;

  private oauth2Session: OAuth2Session;

  constructor(configService: ConfigService<ApiConfig>) {
    this.authorisationApiDid = configService.get<string>("authorisationApiDid");
    this.authorisationApiName = configService.get<string>(
      "authorisationApiName"
    );

    // Instantiate SiopSession
    const didRegistry = `${configService.get<string>(
      "didRegistryApiUrl"
    )}/identifiers`;

    this.siopSession = new SiopSession({ didRegistry });

    // Instantiate OAuth2Session
    const apiName = configService.get<string>("apiName");
    const tarProvider = `${configService.get<string>(
      "trustedAppsRegistry"
    )}/apps`;

    // In the future: remove " " when privateKey becomes optional
    this.oauth2Session = new OAuth2Session(" ", {
      appName: apiName,
      tarProvider,
    });
  }

  // Verify access token with @cef-ebsi/oauth2-auth
  async validateOAuth2Token(bearerToken: string): Promise<AppInfo> {
    let payload: JWTPayload;

    try {
      payload = await this.oauth2Session.verifyAccessToken(
        bearerToken,
        this.authorisationApiName
      );
    } catch (e) {
      let message = "unkown error";

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

  // Verify access token with @cef-ebsi/siop-auth
  async validateSiopToken(bearerToken: string): Promise<ClientInfo> {
    let payload: JWTPayload;

    try {
      payload = await this.siopSession.verifyAccessToken(
        bearerToken,
        this.authorisationApiDid
      );
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
