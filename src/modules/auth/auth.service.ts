import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UnauthorizedError } from "@cef-ebsi/problem-details-errors";
import {
  importJWK,
  jwtVerify,
  decodeJwt,
  decodeProtectedHeader,
  ProtectedHeaderParameters,
  JWTPayload,
} from "jose";
import { Resolver } from "did-resolver";
import { getResolver } from "@cef-ebsi/ebsi-did-resolver";
import { ApiConfig } from "../../config/configuration";

@Injectable()
export default class AuthService {
  private didRegistryApiUrl: string;

  private apiDid: string;

  private timeout: number;

  constructor(configService: ConfigService<ApiConfig>) {
    this.didRegistryApiUrl = configService.get<string>("didRegistryApiUrl");
    [this.apiDid] = configService
      .get<string>("apiVerificationMethodKid")
      .split("#");
    this.timeout = configService.get<number>("requestTimeout");
  }

  async validateToken(token: string): Promise<void> {
    let payload: JWTPayload;
    let header: ProtectedHeaderParameters;

    try {
      payload = decodeJwt(token);
      header = decodeProtectedHeader(token);
    } catch (error) {
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: `Invalid Authorisation Token: ${(error as Error).message}`,
      });
    }

    if (!payload.iss || payload.iss !== this.apiDid) {
      throw new UnauthorizedError(`Unexpected issuer found in session token`);
    }

    try {
      const resolver = new Resolver(
        getResolver({ registry: this.didRegistryApiUrl })
      );

      if (!header.kid || typeof header.kid !== "string") {
        throw new Error(`Invalid JWT kid`);
      }

      const { kid } = header;

      const didDoc = await resolver.resolve(kid, {
        timeout: this.timeout,
      });

      if (!didDoc.didDocument) {
        throw new Error(`Can't find DID document related to ${kid}`);
      }

      const publicKeyJwk = didDoc.didDocument.verificationMethod.find(
        (vm) => vm.id === kid
      )?.publicKeyJwk;

      if (!publicKeyJwk) {
        throw new Error(`Can't find verification method related to ${kid}`);
      }

      const publicKey = await importJWK(publicKeyJwk, "ES256K");

      await jwtVerify(token, publicKey);
    } catch (error) {
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: (error as Error).message,
      });
    }
  }
}
