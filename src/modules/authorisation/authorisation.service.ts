import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import crypto from "crypto";
import jwtVerify from "jose/jwt/verify";
import { BadRequestError } from "@cef-ebsi/problem-details-errors";
import { createJwt, SimpleSigner, decodeJwt } from "@cef-ebsi/did-jwt";
import base64url from "base64url";
import parseJwk, { JWK } from "jose/jwk/parse";
import { JWTOptions } from "@cef-ebsi/did-jwt/dist/types";
import querystring from "querystring";
import { ethers } from "ethers";
import { ApiConfig } from "../../config/configuration";
import {
  AkeResponse,
  Ake1SigPayload,
  AuthenticationRequestResponse,
  TrustedAppResponse,
  JWTHeader,
  JWTPayload,
} from "./authorisation.interface";
import { encrypt } from "./authorisation.utils";

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
  ): Promise<{
    header: JWTHeader;
    payload: JWTPayload;
    publicKey: crypto.KeyObject;
  }> {
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
    let publicKey: crypto.KeyObject;
    const validations = await Promise.all(
      publicKeys.map(async (publicKeyPemBase64) => {
        const publicKeyPem = Buffer.from(publicKeyPemBase64, "base64").toString(
          "utf8"
        );
        const publicKeyObject = crypto.createPublicKey(publicKeyPem);
        try {
          await jwtVerify(assertion, publicKeyObject);
          publicKey = publicKeyObject;
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

  async validateIdToken(
    idToken: string
  ): Promise<{
    header: JWTHeader;
    payload: JWTPayload;
    publicKey: crypto.KeyObject;
    publicKeyEncryption?: crypto.KeyObject;
  }> {
    const jwtDecoded = decodeJwt(idToken);
    const { header, payload } = jwtDecoded;
    const allowedAlgs = ["RS256", "ES256", "ES256K", "EdDSA"];

    // check header
    if (
      !allowedAlgs.includes(header.alg) ||
      header.typ !== "JWT" ||
      !header.kid
    )
      throw new BadRequestError("Invalid Id Token", {
        detail: "Invalid JWT header",
      });

    if (
      !payload.iss ||
      !payload.sub ||
      !payload.aud ||
      !payload.exp ||
      !payload.iat ||
      !payload.sub_jwk ||
      !payload.sub_did_verification_method_uri ||
      !payload.nonce ||
      !payload.claims
    )
      throw new BadRequestError("Invalid Id Token", {
        detail:
          "The payload should contain iss, sub, aud, exp, iat, sub_jwk, sub_did_verification_method_uri, nonce, and claims",
      });

    /* TODO:
       - check state and nonce
       - check if the DID is registered in the DID Registry
       - validate Verifiable Authorisation in claims
     */

    let publicKey: crypto.KeyObject;
    try {
      const subJwk = Array.isArray(payload.sub_jwk)
        ? (payload.sub_jwk.find(
            (jwk: JWK) => !jwk.use || jwk.use === "sig"
          ) as JWK)
        : (payload.sub_jwk as JWK);
      publicKey = (await parseJwk(subJwk, header.alg)) as crypto.KeyObject;
    } catch (error) {
      throw new BadRequestError("Invalid Id Token", {
        detail: `Invalid sub_jwk: ${(error as Error).message}`,
      });
    }

    let publicKeyEncryption: crypto.KeyObject;
    if (header.alg === "EdDSA") {
      try {
        const subJwk = Array.isArray(payload.sub_jwk)
          ? (payload.sub_jwk.find(
              (jwk: JWK) => !jwk.use || jwk.use === "enc"
            ) as JWK)
          : (payload.sub_jwk as JWK);
        if (subJwk.crv.toUpperCase() !== "X25519")
          throw new Error(
            `Expected jwk with crv:X25519. Received crv:${subJwk.crv}`
          );
        publicKeyEncryption = (await parseJwk(
          subJwk,
          header.alg
        )) as crypto.KeyObject;
      } catch (error) {
        throw new BadRequestError("Invalid Id Token", {
          detail: `Invalid sub_jwk for encryption: ${(error as Error).message}`,
        });
      }
    }

    try {
      await jwtVerify(idToken, publicKey);
    } catch (error) {
      throw new BadRequestError("Invalid Id Token", {
        detail: "Invalid signature",
      });
    }

    return {
      header,
      payload: payload as JWTPayload,
      publicKey,
      publicKeyEncryption,
    };
  }

  async createSession(
    type: string,
    tokenDecoded: {
      header: JWTHeader;
      payload: JWTPayload;
      publicKey: crypto.KeyObject;
      publicKeyEncryption?: crypto.KeyObject;
    }
  ): Promise<AkeResponse> {
    const payload = {
      iss: API_NAME,
      sub: tokenDecoded.payload.iss,
      aud: tokenDecoded.payload.aud,
      exp: Math.trunc(Date.now() / 1000) + this.authExpireTime,
      nonce: crypto.randomBytes(16).toString("base64"),
    };
    const accessToken = await createJwt(
      payload,
      this.jwtOptions,
      this.headerOptions
    );

    const publicKey = tokenDecoded.publicKeyEncryption
      ? tokenDecoded.publicKeyEncryption
      : tokenDecoded.publicKey;
    const encryptedAccessToken = await encrypt(
      tokenDecoded.header.alg,
      {
        access_token: accessToken,
        ...(type === "oauth2" && { kid: this.kid }),
        ...(type === "siop" && { did: this.did }),
        nonce: tokenDecoded.payload.nonce,
      },
      publicKey
    );

    const ake1Sig = await createJwt(
      {
        ake1_nonce: tokenDecoded.payload.nonce,
        ake1_enc_payload: encryptedAccessToken,
        ...(type === "oauth2" && { kid: tokenDecoded.header.kid }),
        ...(type === "siop" && { did: tokenDecoded.payload.iss }),
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
      ...(type === "oauth2" && { kid: this.kid }),
      ...(type === "siop" && { did: this.did }),
    };
  }
}

export default AuthorisationService;
