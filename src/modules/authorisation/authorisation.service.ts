import crypto, { randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  BadRequestError,
  InternalServerError,
  ProblemDetailsError,
} from "@cef-ebsi/problem-details-errors";
import {
  Session as OAuth2Session,
  InvalidAppError,
  InvalidTokenError,
} from "@cef-ebsi/oauth2-auth";
import type { AkeResponse as OAuth2AkeResponse } from "@cef-ebsi/oauth2-auth";
import axios from "axios";
import type { AxiosError } from "axios";
import { importJWK, EncryptJWT, jwtVerify } from "jose";
import { RP, Session as SiopSession, DidAuthErrors } from "@cef-ebsi/siop-auth";
import type {
  DidAuthValidationResponse,
  IdToken,
  ResponseClaims,
  AkeResponse as SiopAkeResponse,
  Ake1SigPayload,
} from "@cef-ebsi/siop-auth";
import { createJWT, decodeJWT, ES256KSigner } from "did-jwt";
import type { JWTOptions, JWTHeader } from "did-jwt";
import { validatePresentation } from "@cef-ebsi/verifiable-presentation";
import type { VerifiablePresentation } from "@cef-ebsi/verifiable-presentation";
import { base64url } from "multiformats/bases/base64";
import Joi from "joi";
import type { DIDDocument } from "did-resolver";
import type { ApiConfig } from "../../config/configuration";
import type { AuthenticationRequestResponse } from "./authorisation.interface";
import type {
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

  private onboardingAllowlist: string[];

  constructor(private configService: ConfigService<ApiConfig>) {
    const domain = this.configService.get<string>("domain");
    const urlPrefix = this.configService.get<string>("apiUrlPrefix");
    this.siopSessionsUrl = `${domain}${urlPrefix}/siop-sessions`;
    this.privateKey = prefix0x(this.configService.get<string>("apiPrivateKey"));
    this.onboardingAllowlist = this.configService.get<string[]>(
      "onboardingAllowlist"
    );
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
    return RP.createAuthenticationRequest({
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

  async createAccessToken(
    header: JWTHeader,
    validation: DidAuthValidationResponse
  ): Promise<SiopAkeResponse> {
    try {
      if (header.alg === "ES256K") {
        // Using @cef-ebsi/siop-auth library (ES256K), and setting payload.did to validation.payload.sub
        return await this.siopSession.createAccessToken(validation);
      }

      // support to other algorithms
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
          sub: validation.payload.sub,
          aud: "ebsi-core-services",
          nonce: randomUUID(),
          login_hint: "did_siop",
        },
        jwtOpts,
        headerOpts
      );

      const encryptionKey = (await importJWK(
        validation.signer.publicKeyJwk,
        header.alg
      )) as crypto.KeyObject;

      const encryptedAccessToken = await new EncryptJWT({
        access_token: accessToken,
        did: this.did,
        nonce: validation.payload.nonce,
      })
        .setProtectedHeader({
          alg: header.alg === "RS256" ? "RSA1_5" : "ECDH-ES",
          enc: "A128GCM",
        })
        .encrypt(encryptionKey);

      const ake1Sig = await createJWT(
        {
          ake1_nonce: validation.payload.nonce as string,
          ake1_enc_payload: encryptedAccessToken,
          did: validation.payload.sub,
        },
        jwtOpts,
        headerOpts
      );
      const ake1SigPayloadBase64url = ake1Sig.split(".")[1];
      const ake1SigPayload = JSON.parse(
        Buffer.from(base64url.baseDecode(ake1SigPayloadBase64url)).toString()
      ) as Ake1SigPayload;
      const ake1JwsDetached = ake1Sig.replace(ake1SigPayloadBase64url, "");

      return {
        ake1_enc_payload: encryptedAccessToken,
        ake1_sig_payload: ake1SigPayload,
        ake1_jws_detached: ake1JwsDetached,
        did: this.did,
      };
    } catch (error) {
      this.logger.error(error, (error as Error).stack);
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: (error as Error).message,
      });
    }
  }

  async createSiopSession(body: SiopSessionDto): Promise<SiopAkeResponse> {
    const { header, payload } = decodeJWT(body.id_token);
    const { claims } = payload as { claims: ResponseClaims };

    let encryptionKey: JsonWebKey;
    if (claims?.encryption_key) {
      encryptionKey = claims.encryption_key as unknown as JsonWebKey;
    }

    if (claims?.verified_claims) {
      /**
       * Using a Verifiable Presentation to request a token
       * It is assumed that the user doesn't have a DID registered
       * then the did registry is not consulted
       */

      // Verifiable Authorisation Verifiable Presentation -- JCS canonicalize + base64url encode
      try {
        Joi.assert(
          claims.verified_claims,
          Joi.string().base64({ paddingRequired: false })
        );
      } catch (error) {
        throw new BadRequestError("Uncoded Verifiable Presentation", {
          detail: (error as Error).message,
        });
      }

      let decodedParsedVP: VerifiablePresentation;
      try {
        decodedParsedVP = JSON.parse(
          Buffer.from(base64url.baseDecode(claims.verified_claims)).toString()
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
      // of them are signed by onboarding allowlist
      if (
        vp.verifiableCredential.length === 0 ||
        vp.verifiableCredential.filter((vc) => {
          const id = typeof vc.issuer === "string" ? vc.issuer : vc.issuer.id;
          return !this.onboardingAllowlist.includes(id);
        }).length > 0
      ) {
        throw new BadRequestError("Invalid Verifiable Presentation", {
          detail: `All verifiable credentials must be signed by issuers in the allowlist: ${this.onboardingAllowlist.join(
            ", "
          )}`,
        });
      }

      const { nonce } = payload as { nonce: string };

      return this.createAccessToken(header, {
        signatureValidation: true,
        signer: {
          publicKeyJwk: encryptionKey,
          type: "",
          id: "",
          controller: "",
        },
        payload: {
          did: vp.holder, // Useful for ES256K, otherwise this.siopSession.createAccessToken doesn't add `ake1_sig_payload.did`
          sub: vp.holder,
          nonce,
        },
      });
    }

    /**
     * No Verifiable Presentation is presented
     * The user is authenticated using the DID Registry
     */

    let validation: DidAuthValidationResponse;

    const allowedAlgs = ["RS256", "ES256", "ES256K", "EdDSA"];

    if (!allowedAlgs.includes(header.alg)) {
      throw new BadRequestError("Invalid ID Token", {
        detail: `Algorithm ${
          header.alg
        } not supported. Supported algorithms: ${JSON.stringify(allowedAlgs)}`,
      });
    }

    if (header.alg === "ES256K") {
      // Using @cef-ebsi/siop-auth library (ES256K)
      try {
        validation = await RP.verifyAuthenticationResponse(
          body.id_token,
          this.didRegistry,
          this.siopSessionsUrl
        );
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes(DidAuthErrors.DID_REGISTRY_ERROR)) {
            throw new InternalServerError(InternalServerError.defaultTitle, {
              detail: DidAuthErrors.DID_REGISTRY_ERROR,
            });
          }

          throw new BadRequestError("Invalid ID Token", {
            detail: error.message,
          });
        }

        throw error;
      }

      if (encryptionKey) {
        if (encryptionKey.crv !== "secp256k1") {
          throw new BadRequestError("Invalid Encryption Key", {
            detail:
              "As the ID Token uses alg ES256K, the encryption key should be empty or use crv:secp256k1",
          });
        }

        // Set new encryption key defined in the ID Token
        validation.signer.publicKeyJwk = encryptionKey;
        validation.signer.publicKeyBase58 = "";
        validation.signer.publicKeyHex = "";
      }

      return this.createAccessToken(header, validation);
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
        if (typeof axiosError.response.data !== "object") {
          throw new BadRequestError("Invalid ID Token", {
            detail: axiosError.response.data as string,
          });
        }

        const response = axiosError.response.data as {
          status: number;
          title: string;
          type?: string;
          detail?: string;
          instance?: string;
        };

        if (response && response.status && response.title) {
          throw new ProblemDetailsError(response.status, response.title, {
            type: response.type,
            detail: response.detail,
            instance: response.instance,
          });
        }
      }
      throw error;
    }

    if (!didDocument || !didDocument.verificationMethod) {
      throw new BadRequestError("Invalid ID Token", {
        detail: "DID Document must have verificationMethod",
      });
    }

    const verificationMethod = didDocument.verificationMethod.find(
      (v) => v.id === payloadResponse.sub_did_verification_method_uri
    );

    if (!verificationMethod) {
      throw new BadRequestError("Invalid DID Document", {
        detail: `ID ${payloadResponse.sub_did_verification_method_uri} not found in the list of verification methods`,
      });
    }

    const { publicKeyJwk } = verificationMethod;

    if (!publicKeyJwk) {
      throw new BadRequestError("Invalid DID Document", {
        detail: `publicKeyJwk not found in the verification method id ${payloadResponse.sub_did_verification_method_uri}`,
      });
    }

    let publicKey: crypto.KeyObject;
    try {
      publicKey = (await importJWK(
        publicKeyJwk,
        header.alg
      )) as crypto.KeyObject;
    } catch (error) {
      throw new BadRequestError("Invalid JWK", {
        detail: `Invalid jwk from DID document: ${(error as Error).message}`,
      });
    }

    try {
      await jwtVerify(body.id_token, publicKey);
    } catch (error) {
      throw new BadRequestError("Invalid ID Token", {
        detail: `ID Token validation failed: ${(error as Error).message}`,
      });
    }

    if (!encryptionKey) {
      encryptionKey = publicKeyJwk;
    }

    // create session
    return this.createAccessToken(header, {
      signatureValidation: true,
      signer: {
        publicKeyJwk: encryptionKey,
        type: "",
        id: "",
        controller: "",
      },
      payload: payloadResponse,
    });
  }
}

export default AuthorisationService;
