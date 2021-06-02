import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { decodeJWT } from "@cef-ebsi/did-jwt";
import { Session as SiopSession } from "@cef-ebsi/siop-auth";
import { Session as Oauth2Session } from "@cef-ebsi/oauth2-auth";
import { UnauthorizedError } from "@cef-ebsi/problem-details-errors";
import { ApiConfig } from "../../config/configuration";
import { Payload } from "./auth.interface";

@Injectable()
export class AuthService {
  private authorisationApiDid: string;

  private authorisationApiName: string;

  private siopSession: SiopSession;

  private oauth2Session: Oauth2Session;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.authorisationApiDid = configService.get<string>("authorisationApiDid");
    this.authorisationApiName = configService.get<string>(
      "authorisationApiName"
    );
    this.siopSession = new SiopSession({
      didRegistry: `${configService.get<string>(
        "didRegistryApiUrl"
      )}/identifiers`,
    });
    this.oauth2Session = new Oauth2Session("undefined", {
      appName: configService.get<string>("apiName"),
      tarProvider: `${configService.get<string>(
        "trustedAppsRegistryApiUrl"
      )}/apps`,
    });
  }

  async validateToken(token: string): Promise<Payload> {
    try {
      const { payload } = decodeJWT(token) as unknown as {
        payload: Payload;
      };
      if (payload.login_hint === "did_siop") {
        return (await this.siopSession.verifyAccessToken(
          token,
          this.authorisationApiDid
        )) as unknown as Payload;
      }
      return (await this.oauth2Session.verifyAccessToken(
        token,
        this.authorisationApiName
      )) as unknown as Payload;
    } catch (error) {
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: (error as Error).message,
      });
    }
  }
}

export default AuthService;
