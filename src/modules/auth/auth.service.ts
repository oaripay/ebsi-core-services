import { Injectable } from "@nestjs/common";
// import { ConfigService } from "@nestjs/config";
// import { JWTPayload, Session } from "@cef-ebsi/oauth2-auth";
// import { UnauthorizedError } from "@cef-ebsi/problem-details-errors";
// import { ApiConfig } from "../../config/configuration";

@Injectable()
export class AuthService {
  /*
  private authApiName: string;

  private session: Session;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.authApiName = configService.get<string>("authApiName");
    this.session = new Session("undefined", {
      appName: configService.get<string>("apiName"),
      tarProvider: configService.get<string>("trustedAppsRegistry"),
    });
  }

  async validateToken(token: string): Promise<JWTPayload> {
    try {
      return await this.session.verifyAccessToken(token, this.authApiName);
    } catch (error) {
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: (error as Error).message,
      });
    }
  }
  */
}

export default AuthService;
