import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import crypto, { randomUUID } from "crypto";
import { BadRequestError } from "@cef-ebsi/problem-details-errors";
import {
  Session as OAuth2Session,
  AkeResponse as OAuth2AkeResponse,
  InvalidAppError,
  InvalidTokenError,
} from "@cef-ebsi/oauth2-auth";
import axios, { AxiosError } from "axios";
import parseJwk, { JWK } from "jose/jwk/parse";
import EncryptJWT from "jose/jwt/encrypt";
import {
  DidAuthValidationResponse,
  EbsiDidAuth,
  IdToken,
  JWTHeader,
  ResponseClaims,
  Session as SiopSession,
} from "@cef-ebsi/siop-auth";
import {
  createJWT,
  decodeJWT,
  ES256KSigner,
  JWTOptions,
} from "@cef-ebsi/did-jwt";
import {
  validatePresentation,
  VerifiablePresentation,
} from "@cef-ebsi/verifiable-presentation";
import base64url from "base64url";
import Joi from "joi";
import { DIDDocument } from "did-resolver";
import jwtVerify from "jose/jwt/verify";
import { Ake1SigPayload } from "@cef-ebsi/siop-auth/dist/Ake";
import { ApiConfig } from "../../config/configuration";
import { AuthenticationRequestResponse } from "./authorisation.interface";
import {
  ClaimRequest,
  OAuth2SessionDto,
  SiopSessionDto,
  JsonWebKey,
} from "./dto";
import { schemaPayloadIdToken } from "./schemas/payloadIdToken.schema";

function prefix0x(value: string): string {
  return value.startsWith("0x") ? value : `0x${value}`;
}

@Injectable()
export class AuthorisationService {
  private readonly logger = new Logger(AuthorisationService.name);

  private siopSessionsUrl: string;

  private privateKey: string;

  private kid: string;

  private did: string;

  private didRegistry: string;

  private oauth2Session: OAuth2Session;

  private siopSession: SiopSession;

  private authorisationCredentialSchema: string;

  private trustedIssuersRegistry: string;

  private onboardingApiDid: string;

  constructor(private configService: ConfigService<ApiConfig>) {
    const domain = this.configService.get<string>("domain");
    const urlPrefix = this.configService.get<string>("apiUrlPrefix");
    this.siopSessionsUrl = `${domain}${urlPrefix}/siop-sessions`;
    this.privateKey = prefix0x(this.configService.get<string>("apiPrivateKey"));
    this.onboardingApiDid = this.configService.get<string>("onboardingApiDid");
    const trustedAppRegistry = this.configService.get<string>(
      "trustedAppsRegistry"
    );
    this.trustedIssuersRegistry = this.configService.get<string>(
      "trustedIssuersRegistry"
    );
    const apiTarId = this.configService.get<string>("apiTarId");
    this.kid = `${trustedAppRegistry}/${apiTarId}`;
    this.didRegistry = this.configService.get<string>("didRegistry");
    this.did = this.configService.get<string>("apiDid");
    this.authorisationCredentialSchema = this.configService.get<string>(
      "authorisationCredentialSchema"
    );

    this.oauth2Session = new OAuth2Session(
      this.configService.get<string>("apiPrivateKey"),
      {
        appName: this.configService.get<string>("apiName"),
        tarProvider: trustedAppRegistry,
        kid: this.kid,
      }
    );

    this.siopSession = new SiopSession({
      privateKey: this.privateKey,
      kid: this.kid,
      did: this.did,
    });
  }

  async authenticationRequest(): Promise<AuthenticationRequestResponse> {
    const claimRequest: ClaimRequest = {
      verified_claims: {
        verification: {
          trust_framework: "EBSI",
          evidence: {
            type: {
              value: "verifiable_credential",
            },
            document: {
              type: {
                essential: true,
                value: ["VerifiableCredential", "VerifiableAuthorisation"],
              },
              credentialSchema: {
                id: {
                  essential: true,
                  value: this.authorisationCredentialSchema,
                },
              },
            },
          },
        },
      },
    };
    return EbsiDidAuth.createAuthenticationRequest({
      redirectUri: this.siopSessionsUrl,
      hexPrivateKey: this.privateKey,
      kid: this.kid,
      issuer: this.did,
      claims: {
        id_token: { ...claimRequest } as IdToken,
      },
    });
  }

  async createOAuth2Session(
    body: OAuth2SessionDto
  ): Promise<OAuth2AkeResponse> {
    let publicKey: crypto.KeyObject;
    try {
      publicKey = await this.oauth2Session.verifyAuthenticationRequest(
        body.clientAssertion
      );
    } catch (error) {
      if (
        error instanceof InvalidAppError ||
        error instanceof InvalidTokenError
      ) {
        throw new BadRequestError("Invalid Client Assertion", {
          detail: error.message,
        });
      }

      throw error;
    }
    return this.oauth2Session.createAccessToken(body, publicKey);
  }

  async createSiopSession(body: SiopSessionDto): Promise<{
    ake1_enc_payload: string;
    ake1_sig_payload: Ake1SigPayload;
    ake1_jws_detached: string;
    did?: string;
  }> {
    const { header, payload } = decodeJWT(body.id_token);

    if (payload.claims && Object.keys(payload.claims).length !== 0) {
      /**
       * Using a Verifiable Presentation to request a token
       * It is assumed that the user doesn't have a DID registered
       * then the did registry is not consulted
       */

      // Verifiable Authorisation Verifiable Presentation -- JCS canonicalize + base64url encode
      const { claims } = payload;
      if (!(claims as ResponseClaims).verified_claims)
        throw new BadRequestError("Invalid id_token payload", {
          detail: `verified_claims not found in id_token claims`,
        });

      const encodedVP = (claims as ResponseClaims).verified_claims;
      try {
        Joi.assert(encodedVP, Joi.string().base64({ paddingRequired: false }));
      } catch (error) {
        throw new BadRequestError("Uncoded Verifiable Presentation", {
          detail: (error as Error).message,
        });
      }

      let decodedParsedVP: VerifiablePresentation;
      try {
        decodedParsedVP = JSON.parse(
          base64url.decode(encodedVP)
        ) as VerifiablePresentation;
      } catch (error) {
        throw new BadRequestError(
          "Verifiable Presentation could not be parsed",
          {
            detail: (error as Error).message,
          }
        );
      }

      // removing proof field
      const { proof, ...vp } = decodedParsedVP;

      try {
        await validatePresentation(vp, {
          tirUrl: this.trustedIssuersRegistry,
          resolver: this.didRegistry,
        });
      } catch (error) {
        throw new BadRequestError("Invalid Verifiable Presentation", {
          detail: (error as Error).message,
        });
      }

      // verify there is at least one credential and verify that all
      // of them are signed by onboarding api
      if (
        vp.verifiableCredential.length === 0 ||
        vp.verifiableCredential
          .map((vc) => vc.issuer)
          .filter((issuer) => issuer !== this.onboardingApiDid).length > 0
      ) {
        throw new BadRequestError("Invalid Verifiable Presentation", {
          detail: `All verifiable credentials must be signed by onboarding api (${this.onboardingApiDid})`,
        });
      }

      try {
        return await this.siopSession.createAccessToken({
          signatureValidation: true,
          signer: {
            publicKeyJwk: (claims as ResponseClaims)
              .encryption_key as unknown as JsonWebKey,
            type: "",
            id: "",
            controller: "",
          },
          payload: {
            did: vp.holder,
            nonce: (payload as { nonce: string }).nonce,
          },
        });
      } catch (error) {
        throw new BadRequestError(BadRequestError.defaultTitle, {
          detail: (error as Error).message,
        });
      }
    }

    /**
     * No Verifiable Presentation is presented
     * The user is authenticated using the DID Registry
     */

    let validation: DidAuthValidationResponse;

    const allowedAlgs = ["RS256", "ES256", "ES256K", "EdDSA"];

    if (!allowedAlgs.includes(header.alg))
      throw new BadRequestError("Invalid ID Token", {
        detail: `Algorithm ${
          header.alg
        } not supported. Supported algorithms: ${JSON.stringify(allowedAlgs)}`,
      });

    if (header.alg === "ES256K") {
      // Using @cef-ebsi/siop-auth library (ES256K)
      try {
        validation = await EbsiDidAuth.verifyAuthenticationResponse(
          body.id_token,
          this.didRegistry,
          this.siopSessionsUrl
        );
      } catch (error) {
        if (error instanceof Error) {
          throw new BadRequestError("Invalid ID Token", {
            detail: error.message,
          });
        }

        throw error;
      }
      return this.siopSession.createAccessToken(validation);
    }

    // Additional support to other algorithms
    // TODO: Consider adding these algorithms to @cef-ebsi/siop-auth library

    try {
      Joi.assert(payload, schemaPayloadIdToken);
    } catch (error) {
      throw new BadRequestError("Invalid ID Token", {
        detail: (error as Error).message,
      });
    }

    const payloadResponse = payload as {
      sub_did_verification_method_uri: string;
      nonce: string;
    };

    let didDocument: DIDDocument;
    const [did] = payloadResponse.sub_did_verification_method_uri.split("#");

    try {
      const response = await axios.get<DIDDocument>(
        `${this.didRegistry}/${did}`
      );
      didDocument = response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.isAxiosError) {
        const message =
          typeof axiosError.response.data === "string"
            ? axiosError.response.data
            : JSON.stringify(axiosError.response.data);
        throw new BadRequestError("Invalid ID Token", {
          detail: message,
        });
      }
      throw error;
    }

    if (!didDocument || !didDocument.verificationMethod)
      throw new BadRequestError("Invalid ID Token", {
        detail: "DID Document must have verificationMethod",
      });

    const verificationMethod = didDocument.verificationMethod.find(
      (v) => v.id === payloadResponse.sub_did_verification_method_uri
    );
    if (!verificationMethod)
      throw new BadRequestError("Invalid DID Document", {
        detail: `ID ${payloadResponse.sub_did_verification_method_uri} not found in the list of verification methods`,
      });

    const { publicKeyJwk } = verificationMethod;

    if (!publicKeyJwk)
      throw new BadRequestError("Invalid DID Document", {
        detail: `publicKeyJwk not found in the verification method id ${payloadResponse.sub_did_verification_method_uri}`,
      });

    let publicKey: crypto.KeyObject;
    try {
      const subJwk = Array.isArray(publicKeyJwk)
        ? (publicKeyJwk.find(
            (jwk: JWK) => !jwk.use || jwk.use === "sig"
          ) as JWK)
        : (publicKeyJwk as JWK);
      publicKey = (await parseJwk(subJwk, header.alg)) as crypto.KeyObject;
    } catch (error) {
      throw new BadRequestError("Invalid JWK", {
        detail: `Invalid sub_jwk: ${(error as Error).message}`,
      });
    }

    let publicKeyEncryption: crypto.KeyObject;
    if (header.alg === "EdDSA") {
      try {
        const subJwk = Array.isArray(publicKeyJwk)
          ? (publicKeyJwk.find(
              (jwk: JWK) => !jwk.use || jwk.use === "enc"
            ) as JWK)
          : (publicKeyJwk as JWK);
        if (subJwk.crv.toUpperCase() !== "X25519")
          throw new Error(
            `Expected jwk with crv:X25519. Received crv:${subJwk.crv}`
          );
        publicKeyEncryption = (await parseJwk(
          subJwk,
          header.alg
        )) as crypto.KeyObject;
      } catch (error) {
        throw new BadRequestError("Invalid JWK", {
          detail: `Invalid jwk for encryption: ${(error as Error).message}`,
        });
      }
    }

    try {
      await jwtVerify(body.id_token, publicKey);
    } catch (error) {
      throw new BadRequestError("Invalid ID Token", {
        detail: `ID Token validation failed: ${(error as Error).message}`,
      });
    }

    // create session

    const headerOpts = {
      typ: "JWT",
      alg: "ES256K",
      kid: this.kid,
    } as JWTHeader;

    const jwtOpts = {
      issuer: this.did,
      signer: ES256KSigner(this.privateKey),
      expiresIn: 900,
    } as JWTOptions;

    const accessToken = await createJWT(
      {
        sub: payload.did as string,
        aud: "ebsi-core-services",
        nonce: randomUUID(),
        login_hint: "did_siop",
      },
      jwtOpts,
      headerOpts
    );

    const pubKey = header.alg === "EdDSA" ? publicKeyEncryption : publicKey;
    const encryptedAccessToken = await new EncryptJWT({
      access_token: accessToken,
      did: this.did,
      nonce: payloadResponse.nonce,
    })
      .setProtectedHeader({
        alg: header.alg === "RS256" ? "RSA1_5" : "ECDH-ES",
        enc: "A128GCM",
      })
      .encrypt(pubKey);

    const ake1Sig = await createJWT(
      {
        ake1_nonce: payloadResponse.nonce,
        ake1_enc_payload: encryptedAccessToken,
        did,
      },
      jwtOpts,
      headerOpts
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
      did: this.did,
    };
  }
}

export default AuthorisationService;
