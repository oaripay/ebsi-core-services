import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import crypto from "crypto";
import { createJwt, SimpleSigner } from "@cef-ebsi/did-jwt";
import { JWTOptions } from "@cef-ebsi/did-jwt/dist/types";
import querystring from "querystring";
import { ApiConfig } from "../../config/configuration";
import { AuthenticationRequestResponse } from "./authorisation.interface";

function prefix0x(value: string): string {
  return value.startsWith("0x") ? value : `0x${value}`;
}

@Injectable()
export class AuthorisationService {
  private readonly logger = new Logger(AuthorisationService.name);

  private urlSiopSessions: string;

  private jwtOptions: JWTOptions;

  constructor(private configService: ConfigService<ApiConfig>) {
    const domain = this.configService.get<string>("domain");
    const urlPrefix = this.configService.get<string>("apiUrlPrefix");
    const privateKey = prefix0x(
      this.configService.get<string>("apiPrivateKey")
    );
    const wallet = new ethers.Wallet(privateKey);

    this.jwtOptions = {
      alg: "ES256K",
      issuer: `did:ebsi:${wallet.address}`,
      signer: SimpleSigner(privateKey.slice(2)),
    };
    this.urlSiopSessions = `${domain}${urlPrefix}/siop-sessions`;
  }

  async authenticationRequest(
    scope: string
  ): Promise<AuthenticationRequestResponse> {
    const requestDetails = {
      scope,
      response_type: "id_token",
      client_id: this.urlSiopSessions,
    };

    const payload = {
      ...requestDetails,
      nonce: crypto.randomBytes(16).toString("base64"),
    };

    const token = await createJwt(payload, this.jwtOptions);
    const query = querystring.encode({
      ...requestDetails,
      request: token,
    });
    return { uri: `openid://?${query}` };
  }
}

export default AuthorisationService;
