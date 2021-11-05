import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JWTPayload } from "did-jwt";
import { Session as SiopSession } from "@cef-ebsi/siop-auth";
import { UnauthorizedError } from "@cef-ebsi/problem-details-errors";
import { ClientInfo } from "./auth.interface";
import { ApiConfig } from "../../config/configuration";

@Injectable()
export class AuthService {
  private authorisationApiDid: string;

  private didRegistry: string;

  private siopSession: SiopSession;

  constructor(configService: ConfigService<ApiConfig>) {
    this.authorisationApiDid = configService.get<string>("authorisationApiDid");

    this.didRegistry = `${configService.get<string>(
      "didRegistryApiUrl"
    )}/identifiers`;

    this.siopSession = new SiopSession({
      didRegistry: this.didRegistry,
    });
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
