import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JWTPayload, decodeJWT } from "did-jwt";
import { Session as SiopSession } from "@cef-ebsi/siop-auth";
import { UnauthorizedError } from "@cef-ebsi/problem-details-errors";
import { ClientInfo, SubjectInfo } from "./auth.interface";
import { ApiConfig } from "../../config/configuration";

@Injectable()
export class AuthService {
  private authorisationApiDid: string;

  private didRegistryApiUrl: string;

  private siopSession: SiopSession;

  constructor(configService: ConfigService<ApiConfig>) {
    this.authorisationApiDid = configService.get<string>("authorisationApiDid");
    this.didRegistryApiUrl = configService.get<string>("didRegistryApiUrl");

    this.siopSession = new SiopSession({
      didRegistry: `${this.didRegistryApiUrl}/identifiers`,
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
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: "Invalid JWT: only SIOP JWTs are supported",
      });
    }

    return { sub };
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
