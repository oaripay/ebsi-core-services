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
  private trustedAppsRegistryApiUrl: string;

  private authorisationApiDid: string;

  private authorisationApiName: string;

  private apiName: string;

  private apiPrivateKey: string;

  private tarProvider: string;

  private didRegistry: string;

  constructor(configService: ConfigService<ApiConfig>) {
    this.apiPrivateKey = configService.get<string>("apiPrivateKey");
    this.apiName = configService.get<string>("apiName");
    this.trustedAppsRegistryApiUrl = configService.get<string>(
      "trustedAppsRegistryApiUrl"
    );
    this.authorisationApiDid = configService.get<string>("authorisationApiDid");
    this.authorisationApiName = configService.get<string>(
      "authorisationApiName"
    );

    this.tarProvider = `${this.trustedAppsRegistryApiUrl}/apps`;

    const domain = configService.get<string>("domain");
    const apiUrlPrefix = configService.get<string>("apiUrlPrefix");
    this.didRegistry = `${domain}${apiUrlPrefix}/identifiers`;
  }

  async validateToken(bearerToken: string): Promise<SubjectInfo> {
    const { payload } = decodeJWT(bearerToken);

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
    const session = new OAuth2Session(this.apiPrivateKey, {
      appName: this.apiName,
      tarProvider: this.tarProvider,
    });

    let payload: JWTPayload;

    try {
      payload = await session.verifyAccessToken(
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
    const session = new SiopSession({
      privateKey: this.apiPrivateKey,
      didRegistry: this.didRegistry,
    });

    let payload: JWTPayload;

    try {
      payload = await session.verifyAccessToken(
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
