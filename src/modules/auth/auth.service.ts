import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JWTPayload, decodeJWT } from "@cef-ebsi/did-jwt";
import { Session as OAuth2Session } from "@cef-ebsi/oauth2-auth";
import { Session as SiopSession } from "@cef-ebsi/siop-auth";
import { UnauthorizedError } from "@cef-ebsi/problem-details-errors";
import { AppInfo, ClientInfo, SubjectInfo } from "./auth.interface";
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

    const domain = configService.get<string>("domain");
    const apiUrlPrefix = configService.get<string>("apiUrlPrefix");

    this.siopSession = new SiopSession({
      didRegistry: `${domain}${apiUrlPrefix}/identifiers`,
    });
    this.oauth2Session = new OAuth2Session("undefined", {
      appName: configService.get<string>("apiName"),
      tarProvider: `${configService.get<string>(
        "trustedAppsRegistryApiUrl"
      )}/apps`,
    });
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

  async validateSiopToken(bearerToken: string): Promise<ClientInfo> {
    // Verify access token with @cef-ebsi/siop-auth
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

    // Populate "clientInfo" object
    return { did: payload.sub };
  }
}

export default AuthService;
