import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { decodeJWT } from "did-jwt";
import { verifyJwtTar as verifyOAuth2Token } from "@cef-ebsi/oauth2-auth";
import { verifyJwtTar as verifySiopToken } from "@cef-ebsi/siop-auth";
import { UnauthorizedError } from "@cef-ebsi/problem-details-errors";
import { ApiConfig } from "../../config/configuration";
import { Payload } from "./auth.interface";

@Injectable()
export class AuthService {
  private authorisationApiName: string;

  private trustedAppsRegistry: string;

  private timeout: number;

  constructor(configService: ConfigService<ApiConfig>) {
    this.authorisationApiName = configService.get<string>(
      "authorisationApiName"
    );

    this.trustedAppsRegistry = `${configService.get<string>(
      "trustedAppsRegistryApiUrl"
    )}/apps`;

    this.timeout = configService.get<number>("requestTimeout");
  }

  async validateToken(token: string): Promise<Payload> {
    try {
      const { payload } = decodeJWT(token) as unknown as {
        payload: Payload;
      };

      if (payload.login_hint === "did_siop") {
        return (
          await verifySiopToken(token, {
            trustedAppsRegistry: this.trustedAppsRegistry,
            audience: "ebsi-core-services",
            timeout: this.timeout,
          })
        ).payload as unknown as Payload;
      }

      return (
        await verifyOAuth2Token(token, {
          trustedAppsRegistry: this.trustedAppsRegistry,
          op: this.authorisationApiName,
          timeout: this.timeout,
        })
      ).payload as unknown as Payload;
    } catch (error) {
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: (error as Error).message,
      });
    }
  }
}

export default AuthService;
