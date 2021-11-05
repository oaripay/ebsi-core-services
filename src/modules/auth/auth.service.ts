import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UnauthorizedError } from "@cef-ebsi/problem-details-errors";
import { decodeJWT, JWTPayload, JWTVerified, verifyJWT } from "did-jwt";
import { Resolver } from "did-resolver";
import { getResolver } from "@cef-ebsi/ebsi-did-resolver";
import { ApiConfig } from "../../config/configuration";

@Injectable()
export default class AuthService {
  private didResolver: string;

  private applicationDid: string;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.didResolver = configService.get<string>("didResolver");
    this.applicationDid = configService.get<string>("applicationDid");
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

    if (!payload.iss || payload.iss !== this.applicationDid) {
      throw new UnauthorizedError(`unexpected issuer found in session token`);
    }

    try {
      const resolver = new Resolver(
        getResolver({ registry: this.didResolver })
      );

      return await verifyJWT(token, { resolver });
    } catch (error) {
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: (error as Error).message,
      });
    }
  }
}
