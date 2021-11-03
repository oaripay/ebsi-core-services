import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JWTPayload } from "did-jwt";
import { Session as SiopSession } from "@cef-ebsi/siop-auth";
import { UnauthorizedError } from "@cef-ebsi/problem-details-errors";
import { ApiConfig } from "../../config/configuration";

@Injectable()
export class AuthService {
  private authorisationApiDid: string;

  private siopSession: SiopSession;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.authorisationApiDid = configService.get<string>("authorisationApiDid");
    this.siopSession = new SiopSession({
      didRegistry: `${configService.get<string>(
        "didRegistryApiUrl"
      )}/identifiers`,
    });
  }

  async validateToken(token: string): Promise<JWTPayload> {
    try {
      return await this.siopSession.verifyAccessToken(
        token,
        this.authorisationApiDid
      );
    } catch (error) {
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: (error as Error).message,
      });
    }
  }
}

export default AuthService;
