import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UnauthorizedError } from "@cef-ebsi/problem-details-errors";
import { decodeJWT, JWTPayload, JWTVerified, verifyJWT } from "did-jwt";
import { Resolver } from "did-resolver";
import { getResolver } from "@cef-ebsi/ebsi-did-resolver";
import { ApiConfig } from "../../config/configuration";

@Injectable()
export default class AuthService {
  private didRegistryApiUrl: string;

  private apiDid: string;

  constructor(configService: ConfigService<ApiConfig>) {
    this.didRegistryApiUrl = configService.get<string>("didRegistryApiUrl");
    [this.apiDid] = configService
      .get<string>("apiVerificationMethodKid")
      .split("#");
  }

  async validateToken(token: string): Promise<JWTVerified> {
    let payload: JWTPayload;

    try {
      payload = decodeJWT(token).payload;
    } catch (error) {
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: `Invalid Authorisation Token: ${(error as Error).message}`,
      });
    }

    if (!payload.iss || payload.iss !== this.apiDid) {
      throw new UnauthorizedError(`unexpected issuer found in session token`);
    }

    try {
      const resolver = new Resolver(
        getResolver({ registry: this.didRegistryApiUrl })
      );

      return await verifyJWT(token, { resolver });
    } catch (error) {
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: (error as Error).message,
      });
    }
  }
}
