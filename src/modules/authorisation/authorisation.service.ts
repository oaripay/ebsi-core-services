import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import crypto from "crypto";
import { BadRequestError } from "@cef-ebsi/problem-details-errors";
import {
  Session as OAuth2Session,
  AkeResponse,
  InvalidAppError,
  InvalidTokenError,
} from "@cef-ebsi/oauth2-auth";
import {
  DidAuthValidationResponse,
  EbsiDidAuth,
  IdToken,
  ResponseClaims,
  Session as SiopSession,
} from "@cef-ebsi/siop-auth";
import { decodeJWT } from "@cef-ebsi/did-jwt";
import {
  validatePresentation,
  VerifiablePresentation,
} from "@cef-ebsi/verifiable-presentation";
import base64url from "base64url";
import { ApiConfig } from "../../config/configuration";
import { AuthenticationRequestResponse } from "./authorisation.interface";
import {
  ClaimRequest,
  OAuth2SessionDto,
  SiopSessionDto,
  JsonWebKey,
} from "./dto";

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

  async createOAuth2Session(body: OAuth2SessionDto): Promise<AkeResponse> {
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

  async createSiopSession(body: SiopSessionDto): Promise<AkeResponse> {
    const { payload } = decodeJWT(body.id_token);

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
      if (Object.keys((claims as ResponseClaims).verified_claims).length === 0)
        throw new BadRequestError("Invalid id_token payload", {
          detail: `verified_claims in id_token claims has no fields`,
        });
      const encodedVP = (claims as ResponseClaims).verified_claims;
      let decodedVP: VerifiablePresentation;
      try {
        decodedVP = JSON.parse(
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
      const { proof, ...vp } = decodedVP;

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
}

export default AuthorisationService;
