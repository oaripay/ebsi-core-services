import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import {
  BadRequestError,
  InternalServerError,
  ProblemDetailsError,
} from "@cef-ebsi/problem-details-errors";
import { RP as OAuth2RP, verifyJwtTar } from "@cef-ebsi/oauth2-auth";
import type {
  AkeResponse as OAuth2AkeResponse,
  JwtTarVefifyResult,
} from "@cef-ebsi/oauth2-auth";
import { RP, verifyJwtDid, encode } from "@cef-ebsi/siop-auth";
import type {
  ResponseClaims,
  VerifyResponseResult,
  AkeResponse as SiopAkeResponse,
} from "@cef-ebsi/siop-auth";
import {
  EbsiVerifiableAttestation,
  verifyCredentialJwt,
} from "@cef-ebsi/verifiable-credential";
import type { EbsiVerifiablePresentation } from "@cef-ebsi/verifiable-presentation";
import { importJWK, JWK } from "jose";
import { decodeJWT } from "did-jwt";
import type { JWTDecoded } from "did-jwt/lib/JWT";
import type { ApiConfig } from "../../config/configuration";
import type { ClaimRequest, OAuth2SessionDto, SiopSessionDto } from "./dto";

function prefix0x(value: string): string {
  return value.startsWith("0x") ? value : `0x${value}`;
}

@Injectable()
export class AuthorisationService {
  private readonly logger = new Logger(AuthorisationService.name);

  private siopSessionsUrl: string;

  private privateKey: string;

  private kid: string;

  private didRegistry: string;

  private trustedAppsRegistry: string;

  private oauth2RP: OAuth2RP;

  private relyingParty: RP;

  private authorisationCredentialSchema: string;

  private onboardingAllowlist: string[];

  private timeout: number;

  constructor(private configService: ConfigService<ApiConfig, true>) {
    const domain = this.configService.get<string>("domain");
    const urlPrefix = this.configService.get<string>("apiUrlPrefix");
    this.siopSessionsUrl = `${domain}${urlPrefix}/siop-sessions`;
    this.privateKey = prefix0x(this.configService.get<string>("apiPrivateKey"));
    this.onboardingAllowlist = this.configService.get<string[]>(
      "onboardingAllowlist"
    );
    this.didRegistry = this.configService.get<string>("didRegistry");
    this.trustedAppsRegistry = this.configService.get<string>(
      "trustedAppsRegistry"
    );
    const apiName = this.configService.get<string>("apiName");
    this.kid = `${this.trustedAppsRegistry}/${apiName}`;
    this.authorisationCredentialSchema = this.configService.get<string>(
      "authorisationCredentialSchema"
    );
    this.timeout = configService.get<number>("requestTimeout");

    this.oauth2RP = new OAuth2RP({
      privateKey: this.configService.get<string>("apiPrivateKey"),
      name: apiName,
      trustedAppsRegistry: this.trustedAppsRegistry,
    });
  }

  async getRelyingParty(): Promise<RP> {
    if (this.relyingParty) {
      return this.relyingParty;
    }

    this.relyingParty = new RP({
      privateKey: await importJWK(
        encode.privateKey.fromHextoJWK(this.privateKey),
        "ES256K"
      ),
      alg: "ES256K",
      name: this.configService.get<string>("apiName"),
      kid: this.kid,
      redirectUri: this.siopSessionsUrl,
      didRegistry: this.didRegistry,
    });

    return this.relyingParty;
  }

  async authenticationRequest(): Promise<string> {
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

    const res = await (
      await this.getRelyingParty()
    ).createRequest({
      claims: {
        id_token: { ...claimRequest },
      },
    });

    return res;
  }

  async createOAuth2Session(
    body: OAuth2SessionDto
  ): Promise<OAuth2AkeResponse> {
    let resVerification: JwtTarVefifyResult;

    try {
      resVerification = await verifyJwtTar(body.clientAssertion, {
        trustedAppsRegistry: this.trustedAppsRegistry,
        timeout: this.timeout,
      });
    } catch (e) {
      if (e instanceof Error) {
        this.logger.error(e.message);
        throw new BadRequestError("Invalid Client Assertion", {
          detail: e.message,
        });
      }

      throw e;
    }

    return this.oauth2RP.createAccessToken(body, resVerification);
  }

  async validateVcList(vcList: unknown, holder: string) {
    // There must be at least 1 VC
    if (!vcList || !Array.isArray(vcList) || vcList.length === 0) {
      return false;
    }

    // All the VCs must be valid and the signer must be in the onboarding allowList
    return (
      await Promise.all(
        vcList.map(async (verifiableCredential: unknown) => {
          if (typeof verifiableCredential !== "string") {
            throw new BadRequestError("Invalid Verifiable Presentation", {
              detail: "All the VCs must be JWTs",
            });
          }

          try {
            const domain = this.configService.get<string>("domain");

            // Verify VC
            await verifyCredentialJwt(verifiableCredential, {
              ebsiAuthority: domain.replace(/^https?:\/\//, ""), // remove http protocol scheme
              timeout: this.timeout,
            });
          } catch (e) {
            if (e instanceof Error) {
              throw new BadRequestError("Invalid Verifiable Credential", {
                detail: e.message,
              });
            }

            throw new BadRequestError("Invalid Verifiable Credential", {
              detail: "Unable to decode VC JWT",
            });
          }

          // Ideally, we should check if verifiedVc.payload.vc is of type EbsiVerifiableAttestation
          const { payload } = decodeJWT(verifiableCredential);
          const { vc, sub } = payload as {
            sub: string;
            vc: EbsiVerifiableAttestation;
          };

          if (!vc || !vc.issuer) {
            return false;
          }

          if (sub !== holder) {
            throw new BadRequestError("Invalid Verifiable Credential", {
              detail: `VC subject "${sub}" and VP holder "${holder}" don't match`,
            });
          }

          const { issuer } = vc;

          return this.onboardingAllowlist.includes(issuer);
        })
      )
    ).every((valid) => valid);
  }

  async createSiopSession(body: SiopSessionDto): Promise<SiopAkeResponse> {
    const { header, payload } = decodeJWT(body.id_token);
    const { claims } = payload as { claims: ResponseClaims };

    let encryptionKey: JWK;
    if (claims?.encryption_key) {
      encryptionKey = claims.encryption_key;
    }

    if (body.vp_token) {
      let decodedVp: JWTDecoded;
      try {
        decodedVp = decodeJWT(body.vp_token);
      } catch (error) {
        throw new BadRequestError("Invalid Verifiable Presentation", {
          detail: (error as Error).message,
        });
      }

      // Ideally, we should check if  decodedVp.payload.vp is of type EbsiPresentationPayload
      const { vp } = decodedVp.payload as { vp: EbsiVerifiablePresentation };

      if (!vp) {
        throw new BadRequestError("Invalid Verifiable Presentation", {
          detail: "The VP must have a vp attribute",
        });
      }

      // verify there is at least one credential and verify that all
      // of them are signed by onboarding allowlist
      if (!(await this.validateVcList(vp.verifiableCredential, vp.holder))) {
        throw new BadRequestError("Invalid Verifiable Presentation", {
          detail: `All verifiable credentials must be signed by issuers in the allowlist: ${this.onboardingAllowlist.join(
            ", "
          )}`,
        });
      }

      const { nonce } = payload as { nonce: string };

      return (await this.getRelyingParty()).createAccessToken({
        header,
        resultClaims: {
          encryption_key: encryptionKey,
          did: vp.holder,
        },
        payload: {
          did: vp.holder,
          sub: vp.holder,
          nonce,
        },
      });
    }

    /**
     * No Verifiable Presentation is presented
     * The user is authenticated using the DID Registry
     */
    let resVerification: VerifyResponseResult;

    const allowedAlgs = ["RS256", "ES256", "ES256K", "EdDSA"];

    if (!allowedAlgs.includes(header.alg)) {
      throw new BadRequestError("Invalid ID Token", {
        detail: `Algorithm ${
          header.alg
        } not supported. Supported algorithms: ${JSON.stringify(allowedAlgs)}`,
      });
    }

    try {
      resVerification = await RP.verifyResponse(
        body.id_token,
        async (idTokenClaims) => {
          if (!idTokenClaims || !idTokenClaims.encryption_key) {
            throw new Error("no encryption_key found in the claims");
          }

          const { didDocument } = await verifyJwtDid(body.id_token, {
            didRegistry: this.didRegistry,
            timeout: this.timeout,
          });

          const did = didDocument?.id ?? "";

          return { ...idTokenClaims, did };
        }
      );
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message === "Internal Server Error" ||
          error.message.includes("Error: internalServerError")
        ) {
          throw new InternalServerError();
        }

        if (axios.isAxiosError(error)) {
          if (typeof error.response.data !== "object") {
            throw new BadRequestError("Invalid ID Token", {
              detail: error.response.data as string,
            });
          }

          const response = error.response.data as {
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
          throw new BadRequestError("Invalid ID Token", {
            detail: error.message,
          });
        }

        throw new BadRequestError("Invalid ID Token", {
          detail: error.message,
        });
      }

      throw error;
    }

    return (await this.getRelyingParty()).createAccessToken(resVerification);
  }
}

export default AuthorisationService;
