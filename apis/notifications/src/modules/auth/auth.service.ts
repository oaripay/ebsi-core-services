import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { JWTPayload } from "did-jwt";
import { verifyJwtTar } from "@cef-ebsi/siop-auth";
import { UnauthorizedError } from "@cef-ebsi/problem-details-errors";
import type { ApiConfig } from "../../config/configuration";

@Injectable()
export class AuthService {
  private trustedAppsRegistry: string;

  private timeout: number;

  constructor(configService: ConfigService<ApiConfig, true>) {
    this.trustedAppsRegistry = `${configService.get<string>(
      "trustedAppsRegistryApiUrl"
    )}/apps`;
    this.timeout = configService.get<number>("requestTimeout");
  }

  async validateToken(token: string): Promise<JWTPayload> {
    try {
      return (
        await verifyJwtTar(token, {
          trustedAppsRegistry: this.trustedAppsRegistry,
          audience: "ebsi-core-services",
          timeout: this.timeout,
        })
      ).payload;
    } catch (error) {
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: (error as Error).message,
      });
    }
  }
}

export default AuthService;
