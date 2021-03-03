import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import crypto from "crypto";
import jwtVerify from "jose/jwt/verify";
import { BadRequestError } from "@cef-ebsi/problem-details-errors";
import { createJwt, SimpleSigner, decodeJwt } from "@cef-ebsi/did-jwt";
import base64url from "base64url";
import { JWTHeader, JWTOptions } from "@cef-ebsi/did-jwt/dist/types";
import querystring from "querystring";
import { ethers } from "ethers";
import { ApiConfig } from "../../config/configuration";
import {
  AkeResponse,
  Ake1SigPayload,
  AuthenticationRequestResponse,
  TrustedAppResponse,
  JWTPayload,
} from "./authorisation.interface";
import { encrypt, getAddress } from "./authorisation.utils";

function prefix0x(value: string): string {
  return value.startsWith("0x") ? value : `0x${value}`;
}

const API_NAME = "authorisation-api";

@Injectable()
export class AuthorisationService {
  private readonly logger = new Logger(AuthorisationService.name);

  private urlSiopSessions: string;

  private jwtOptions: JWTOptions;

  private privateKey: string;

  private headerOptions: {
    kid: string;
  };

  private regExpTarUrl: RegExp;

  private authExpireTime: number;

  private kid: string;

  private did: string;

  constructor(private configService: ConfigService<ApiConfig>) {
    const domain = this.configService.get<string>("domain");
    const urlPrefix = this.configService.get<string>("apiUrlPrefix");
    this.privateKey = prefix0x(this.configService.get<string>("apiPrivateKey"));
    const trustedAppRegistry = this.configService.get<string>(
      "trustedAppsRegistry"
    );
    const applicationId = this.configService.get<string>("applicationId");
    this.authExpireTime = this.configService.get<number>("authExpireTime");
    const wallet = new ethers.Wallet(this.privateKey);
    this.kid = `${trustedAppRegistry}/apps/${applicationId}`;
    this.did = `did:ebsi:${wallet.address.toLowerCase()}`;

    this.jwtOptions = {
      alg: "ES256K",
      issuer: API_NAME,
      signer: SimpleSigner(this.privateKey.slice(2)),
    } as JWTOptions;
    this.urlSiopSessions = `${domain}${urlPrefix}/siop-sessions`;
    this.regExpTarUrl = new RegExp(
      `^${trustedAppRegistry}/apps/(0x|)[0-9a-fA-F]{64}$`
    );
    this.headerOptions = {
      kid: this.kid,
    };
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
      iss: API_NAME,
      nonce: crypto.randomBytes(16).toString("base64"),
    };

    const token = await createJwt(payload, this.jwtOptions, this.headerOptions);
    const query = querystring.encode({
      ...requestDetails,
      request: token,
    });
    return { uri: `openid://?${query}` };
  }

  async validateClientAssertion(
    assertion: string
  ): Promise<{ header: JWTHeader; payload: JWTPayload; publicKey: string }> {
    const { header, payload } = decodeJwt(assertion);

    // check header
    if (
      header.alg !== "ES256K" ||
      header.typ !== "JWT" ||
      !this.regExpTarUrl.test(header.kid)
    )
      throw new BadRequestError("Invalid Client Assertion", {
        detail: "Invalid JWT header",
      });

    // get public key from TAR
    const { data } = ((await axios.get(
      header.kid
    )) as unknown) as TrustedAppResponse;
    const { name, publicKeys } = data;
    if (payload.iss !== name)
      throw new BadRequestError("Invalid Client Assertion", {
        detail: `Expected issuer: ${name}. Payload iss: ${payload.iss}`,
      });

    // validate the signature using the available public keys
    let publicKey: string;
    const validations = await Promise.all(
      publicKeys.map(async (publicKeyPemBase64) => {
        const publicKeyPem = Buffer.from(publicKeyPemBase64, "base64").toString(
          "utf8"
        );
        const publicKeyObject = crypto.createPublicKey(publicKeyPem);
        try {
          await jwtVerify(assertion, publicKeyObject);
          publicKey = publicKeyPemBase64;
          return true;
        } catch (error) {
          return false;
        }
      })
    );

    if (!validations.includes(true))
      throw new BadRequestError("Invalid Client Assertion", {
        detail: "Invalid signature",
      });

    if (
      !payload.sub ||
      !payload.aud ||
      !payload.jti ||
      !payload.exp ||
      !payload.nonce
    )
      throw new BadRequestError("Invalid Client Assertion", {
        detail: "The payload should contain sub, aud, jti, nonce, and exp",
      });

    return { header, payload: payload as JWTPayload, publicKey };
  }

  async oauth2Session(
    clientPayload: JWTPayload,
    publicKeyRecipient: string,
    kid?: string
  ): Promise<AkeResponse> {
    const payload = {
      iss: API_NAME,
      sub: clientPayload.iss,
      aud: clientPayload.aud,
      exp: Math.trunc(Date.now() / 1000) + this.authExpireTime,
      nonce: crypto.randomBytes(16).toString("base64"),
    };
    const accessToken = await createJwt(
      payload,
      this.jwtOptions,
      this.headerOptions
    );

    const encryptedAccessToken = await encrypt(
      this.privateKey,
      JSON.stringify({
        access_token: accessToken,
        ...(kid && { kid: this.kid }),
        ...(!kid && { did: this.did }),
      }),
      clientPayload.nonce,
      publicKeyRecipient
    );

    const ake1Sig = await createJwt(
      {
        ake1_nonce: clientPayload.nonce,
        ake1_enc_payload: encryptedAccessToken,
        kid,
        ...(!kid && { did: `did:ebsi:${getAddress(publicKeyRecipient)}` }),
      },
      this.jwtOptions,
      this.headerOptions
    );
    const ake1SigPayloadBase64url = ake1Sig.split(".")[1];
    const ake1SigPayload = JSON.parse(
      base64url.decode(ake1SigPayloadBase64url)
    ) as Ake1SigPayload;
    const ake1JwsDetached = ake1Sig.replace(ake1SigPayloadBase64url, "");

    return {
      ake1_enc_payload: encryptedAccessToken,
      ake1_sig_payload: ake1SigPayload,
      ake1_jws_detached: ake1JwsDetached,
      ...(kid && { kid: this.kid }),
      ...(!kid && { did: this.did }),
    };
  }
}

export default AuthorisationService;
