import { JsonWebKey, randomUUID } from "node:crypto";
import { Injectable, Inject, Logger } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { ConfigService } from "@nestjs/config";
import type { ReadonlyDeep } from "type-fest";
import {
  BadRequestError,
  logAxiosError,
  encode,
  ProblemDetailsError,
  InternalServerError,
} from "@ebsiint-api/shared";
import type { PresentationSubmission } from "@sphereon/pex-models";
import { verifyPresentationJwt } from "@cef-ebsi/verifiable-presentation";
import type {
  EbsiVerifiablePresentation,
  VpJwtPayload,
} from "@cef-ebsi/verifiable-presentation";
import { RP as OAuth2RP, verifyJwtTar } from "@cef-ebsi/oauth2-auth";
import type {
  AkeResponse as OAuth2AkeResponse,
  JwtTarVerifyResult,
} from "@cef-ebsi/oauth2-auth";
import { RP, verifyJwtDid } from "@cef-ebsi/siop-auth";
import type {
  VerifyResponseResult,
  AkeResponse as SiopAkeResponse,
} from "@cef-ebsi/siop-auth";
import { PEXv2 } from "@sphereon/pex";
import type { Checked } from "@sphereon/pex";
import type { IPresentation, IVerifiableCredential } from "@sphereon/ssi-types";
import { decodeJWT, createJWT, ES256Signer, hexToBytes } from "did-jwt";
import type { JWTPayload } from "did-jwt";
import type { MemoryCache } from "cache-manager";
import axios, { type AxiosResponse } from "axios";
import { importJWK } from "jose";
import type { ApiConfig } from "../../config/configuration.js";
import type {
  JsonWebKeySet,
  OPMetadata,
  TokenResponse,
} from "./authorisation.interfaces.js";
import {
  ClaimRequest,
  CreateAccessTokenDto,
  OAuth2SessionDto,
  SiopSessionDto,
} from "./dto/index.js";
import { fromHexToJWK, parseDto } from "./authorisation.utils.js";
import {
  SUPPORTED_SCOPES,
  DIDR_INVITE_SCOPE,
  TIR_INVITE_SCOPE,
  TIR_WRITE_SCOPE,
  CUSTOM_SCOPES,
  TNT_AUTHORISE_SCOPE,
  PRESENTATION_DEFINITIONS,
  TNT_CREATE_SCOPE,
} from "./authorisation.constants.js";
import type { PresentationDefinition } from "../../shared/interfaces/pex.js";
import {
  issuerSchema,
  presentationSubmissionSchema,
} from "./validators/index.js";
import { ClassValidatorError, OAuth2TokenError } from "./errors/index.js";

@Injectable()
export class AuthorisationService {
  private readonly logger = new Logger(AuthorisationService.name);

  private readonly issuer: string;

  private oauth2RP: OAuth2RP;

  private relyingParty?: RP;

  private publicKeyJwk?: JsonWebKey;

  private readonly ebsiAuthority: string;

  private readonly apiES256KPrivateKey: string;

  private readonly apiES256PrivateKey: string;

  private readonly apiName: string;

  private readonly kid: string;

  private readonly siopSessionsUrl: string;

  private readonly didRegistry: string;

  private readonly trustedIssuersRegistry: string;

  private readonly trustedAppsRegistry: string;

  private readonly trustedPoliciesRegistry: string;

  private readonly trackAndTraceAccessesEndpoint: string;

  private readonly trustedHostnames: string[];

  private readonly authorisationCredentialSchema: string;

  private readonly tntAuthorisePresentationDefinition: ReadonlyDeep<PresentationDefinition>;

  private timeout: number;

  constructor(
    configService: ConfigService<ApiConfig, true>,
    @Inject(CACHE_MANAGER) private cacheManager: MemoryCache,
  ) {
    const domain = configService.get("domain", { infer: true });
    this.ebsiAuthority = domain.replace(/^https?:\/\//, ""); // remove http protocol scheme
    const apiUrlPrefix = configService.get("apiUrlPrefix", { infer: true });
    this.issuer = `${domain}${apiUrlPrefix}`;
    this.didRegistry = configService.get("didRegistry", { infer: true });
    this.trustedIssuersRegistry = configService.get("trustedIssuersRegistry", {
      infer: true,
    });
    this.trustedAppsRegistry = configService.get("trustedAppsRegistry", {
      infer: true,
    });
    this.trustedPoliciesRegistry = configService.get(
      "trustedPoliciesRegistry",
      { infer: true },
    );
    this.trackAndTraceAccessesEndpoint = configService.get(
      "trackAndTraceAccessesEndpoint",
      {
        infer: true,
      },
    );
    this.timeout = configService.get("requestTimeout", { infer: true });
    this.apiES256PrivateKey = configService.get("apiES256PrivateKey", {
      infer: true,
    });
    this.apiES256KPrivateKey = configService.get("apiPrivateKey", {
      infer: true,
    });
    this.apiName = configService.get("apiName", { infer: true });
    this.kid = `${this.trustedAppsRegistry}/${this.apiName}`;
    this.siopSessionsUrl = `${domain}${apiUrlPrefix}/siop-sessions`;
    this.trustedHostnames = configService.get("trustedHostnames", {
      infer: true,
    });

    this.oauth2RP = new OAuth2RP({
      privateKey: this.apiES256KPrivateKey,
      name: this.apiName,
      trustedAppsRegistry: this.trustedAppsRegistry,
    });

    this.authorisationCredentialSchema = configService.get(
      "authorisationCredentialSchema",
      { infer: true },
    );

    // Create custom presentation definition for tnt_authorise scope with allowed issuers
    const tntAuthorisePresentationDefinition = structuredClone(
      PRESENTATION_DEFINITIONS[TNT_AUTHORISE_SCOPE],
    );
    const tntAuthoriseIssuersAllowlist = configService.get(
      "tntAuthoriseIssuersAllowlist",
      { infer: true },
    );
    // @ts-expect-error presentationDefinition is supposed to be immutable, but we're working on a clone.
    tntAuthorisePresentationDefinition.input_descriptors[0].constraints.fields[1].filter.enum =
      tntAuthoriseIssuersAllowlist;
    this.tntAuthorisePresentationDefinition =
      tntAuthorisePresentationDefinition;
  }

  async getRelyingParty(): Promise<RP> {
    if (this.relyingParty) {
      return this.relyingParty;
    }

    this.relyingParty = new RP({
      privateKey: await importJWK(
        encode.privateKey.fromHexToJWK(this.apiES256KPrivateKey),
        "ES256K",
      ),
      alg: "ES256K",
      name: this.apiName,
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
    body: OAuth2SessionDto,
  ): Promise<OAuth2AkeResponse> {
    let resVerification: JwtTarVerifyResult;

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

  async createSiopSession(body: SiopSessionDto): Promise<SiopAkeResponse> {
    const { header } = decodeJWT(body.id_token);

    if (body.vp_token) {
      throw new BadRequestError("Invalid Verifiable Presentation", {
        detail: "Verifiable Presentations are deprecated for /siop-sessions",
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
        },
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
          if (typeof error.response?.data !== "object") {
            throw new BadRequestError("Invalid ID Token", {
              detail: error.response?.data as string,
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
              ...(response.type && { type: response.type }),
              ...(response.detail && { detail: response.detail }),
              ...(response.instance && { instance: response.instance }),
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

  /**
   * Load OP's ES256 signing key from environment and return it as JWK.
   * Note: in the future, the keys will be dynamically generated and rolled every X minutes.
   *
   * @returns The public key JWK (including "kid")
   */
  private async getPublicKeyJwk() {
    if (!this.publicKeyJwk) {
      this.publicKeyJwk = await fromHexToJWK(this.apiES256PrivateKey);
    }

    return this.publicKeyJwk;
  }

  getOPMetadata(): OPMetadata {
    return {
      issuer: this.issuer,
      authorization_endpoint: `${this.issuer}/authorize`,
      token_endpoint: `${this.issuer}/token`,
      presentation_definition_endpoint: `${this.issuer}/presentation-definitions`,
      jwks_uri: `${this.issuer}/jwks`,
      scopes_supported: SUPPORTED_SCOPES,
      response_types_supported: ["token"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["none"],
      subject_syntax_types_supported: ["did:ebsi", "did:key"],
      token_endpoint_auth_methods_supported: ["private_key_jwt"],
      vp_formats_supported: {
        jwt_vp: { alg_values_supported: ["ES256"] },
        jwt_vc: { alg_values_supported: ["ES256"] },
      },
      grant_types_supported: ["vp_token"],
      subject_trust_frameworks_supported: ["ebsi"],
      id_token_types_supported: ["subject_signed_id_token"],
    };
  }

  /**
   * Expose OP's public keys.
   *
   * @returns The OP's JWKS
   */
  async getJwks(): Promise<JsonWebKeySet> {
    const jwk = await this.getPublicKeyJwk();

    // Return JWKS
    return {
      keys: [jwk],
    };
  }

  /**
   * Return a Presentation Definition articulating what proofs the OP requires.
   *
   * Specs:
   * - https://identity.foundation/presentation-exchange/spec/v2.0.0/#presentation-definition
   * - https://ec.europa.eu/digital-building-blocks/wikis/pages/viewpage.action?spaceKey=BLOCKCHAININT&title=RFC+-+EBSI+Platform+Identity+and+Access+Management#RFCEBSIPlatformIdentityandAccessManagement-ServicetoService-TokenFlow
   *
   * @param scope Array of supported scopes ("openid", "didr_invite", "didr_write", "tir_invite", "tir_write", "timestamp_write", "tnt_authorise")
   * @returns A Presentation Definition.
   */
  getPresentationDefinitions(scope: (typeof CUSTOM_SCOPES)[number]) {
    if (!(scope in PRESENTATION_DEFINITIONS)) {
      throw new OAuth2TokenError("invalid_request", {
        errorDescription: `Unhandled scope "${scope as string}"`,
      });
    }

    // Special case for "tnt_authorise": use customized presentation definition
    if (scope === TNT_AUTHORISE_SCOPE) {
      return this.tntAuthorisePresentationDefinition;
    }

    return PRESENTATION_DEFINITIONS[scope];
  }

  async preventReplayAttack(payload: JWTPayload) {
    if (!payload["nonce"]) {
      throw new OAuth2TokenError("invalid_request", {
        errorDescription:
          "The vp_token must contain a nonce in order to prevent replay attacks.",
      });
    }

    const cacheKey = payload["nonce"] as string;
    const nonceUsed = await this.cacheManager.get(cacheKey);
    if (nonceUsed) {
      throw new OAuth2TokenError("invalid_request", {
        errorDescription:
          "The vp_token contains a nonce which has already been used.",
      });
    }
    await this.cacheManager.set(cacheKey, cacheKey, 300_000); // 5 minutes (5* 60 * 1000)
  }

  /**
   * Validates that the Presentation Exchange is correct, i.e. the submitted VP and its associated
   * presentation_submission match the requirements of the given presentation_definition.
   *
   * @param vp - The Verifiable Presentation extracted from the VP Token.
   * @param presentationDefinition - The Presentation Definition that articulates the proof requirements.
   * @param presentationSubmission - The Presentation Submission that describes the proofs submitted.
   */
  validatePresentationExchange(
    vp: EbsiVerifiablePresentation,
    presentationDefinition: ReadonlyDeep<PresentationDefinition>,
    presentationSubmission: PresentationSubmission,
  ) {
    const errors: Checked[] = [];

    // Exit early if the presentation submission is empty (e.g. for didr_write or tir_write)
    if (
      !presentationSubmission.descriptor_map ||
      presentationSubmission.descriptor_map.length === 0
    ) {
      return;
    }

    // Evaluate each descriptor_map[x] individually
    presentationSubmission.descriptor_map.forEach((descriptor) => {
      // Trim presentation definition: keep only the constraints related to descriptor.id
      // Reason: the PEX library tries to apply every constraint to every input
      const trimmedPresentationDefinition = {
        ...presentationDefinition,
        input_descriptors: presentationDefinition.input_descriptors.filter(
          (inputDescriptor) => inputDescriptor.id === descriptor.id,
        ),
      } as const;

      const presentation = {
        "@context": vp["@context"],
        type: vp.type,
        holder: vp.holder,
        presentation_submission: presentationSubmission,
        verifiableCredential:
          vp.verifiableCredential as unknown as IVerifiableCredential[],
      } satisfies IPresentation;

      try {
        const pex = new PEXv2();
        const result = pex.evaluatePresentation(
          trimmedPresentationDefinition as PresentationDefinition,
          presentation,
        );

        if (result.errors) {
          errors.push(...result.errors);
        }
      } catch (error) {
        if (error instanceof Error) {
          throw new OAuth2TokenError("invalid_request", {
            errorDescription: `Invalid Presentation Submission: ${error.message}`,
          });
        }
      }
    });

    if (errors && errors.length > 0) {
      throw new OAuth2TokenError("invalid_request", {
        errorDescription: `Invalid Presentation Submission:\n${errors
          .map(
            (error) => `${error.tag} tag: ${error.message ?? "Unknown error"};`,
          )
          .join()}`,
      });
    }
  }

  /**
   * Validate VP Token.
   *
   * @param vpToken - The VP Token to validate.
   * @param isDidUnresolvable - If the holder DID is unresolvable, the signature validation is skipped.
   */
  async validateVpJwt(vpToken: string, isDidUnresolvable: boolean) {
    try {
      const audience = this.issuer;
      const now = Math.floor(Date.now() / 1000);

      await verifyPresentationJwt(vpToken, audience, {
        ebsiAuthority: this.ebsiAuthority,
        ebsiEnvConfig: {
          didRegistry: this.didRegistry,
          trustedIssuersRegistry: this.trustedIssuersRegistry,
          trustedPoliciesRegistry: this.trustedPoliciesRegistry,
        },
        validAt: now, // The JWT VC(s) must be valid now
        skipHolderDidResolutionValidation: isDidUnresolvable,
        skipSignatureValidation: isDidUnresolvable,
        validateAccreditationWithoutTermsOfUse: true, // The VC must contain terms of use (or be self-accredited)
        trustedHostnames: this.trustedHostnames,
      });
    } catch (e) {
      throw new OAuth2TokenError("invalid_request", {
        errorDescription: `Invalid Verifiable Presentation: ${
          e instanceof Error ? e.message : "Unknown error"
        }`,
      });
    }
  }

  /**
   * Ensures that the given presentation_submission object is a valid Presentation Submission object.
   *
   * @param presentationSubmission - The Presentation Submission object to validate.
   * @param definitionId - The Presentation Definition ID that the presentation_submission.definition_id must match.
   */
  validatePresentationSubmissionObject(
    presentationSubmission: PresentationSubmission,
    presentationDefinition: ReadonlyDeep<PresentationDefinition>,
  ) {
    const validationResult = PEXv2.validateSubmission(presentationSubmission);

    const checkedArray = Array.isArray(validationResult)
      ? validationResult
      : [validationResult];

    const errors = checkedArray
      .map((checked) => {
        if (checked.message === "descriptor_map should be a non-empty list") {
          // Accept presentation submissions with empty descriptor map (e.g. for didr_write and tir_write)
          return null;
        }

        if (checked.status === "error") {
          return checked;
        }

        return null;
      })
      .filter(Boolean);

    if (errors.length > 0) {
      throw new OAuth2TokenError("invalid_request", {
        errorDescription: `Invalid Presentation Submission:\n${errors
          .map((err) => `- [${err.tag}] ${err.message ?? "Unknown error"}`)
          .join("\n")}`,
      });
    }

    /**
     * The presentation_submission object MUST contain a definition_id property.
     * The value of this property MUST be the id value of a valid Presentation Definition.
     *
     * @see https://identity.foundation/presentation-exchange/#presentation-submission
     */
    if (presentationSubmission.definition_id !== presentationDefinition.id) {
      throw new OAuth2TokenError("invalid_request", {
        errorDescription:
          "Invalid Presentation Submission: definition_id doesn't match the expected Presentation Definition ID for the requested scope",
      });
    }

    /**
     * Make sure every descriptor_map[x].id of the Presentation Submission
     * matches an existing input_descriptors[x].id of the Presentation Definition
     */
    (presentationSubmission.descriptor_map || []).forEach((descriptor) => {
      const matchingDescriptor = presentationDefinition.input_descriptors.find(
        (inputDescriptor) => inputDescriptor.id === descriptor.id,
      );

      if (!matchingDescriptor) {
        throw new OAuth2TokenError("invalid_request", {
          errorDescription: `The presentation definition doesn't contain any input descriptor with the ID ${descriptor.id}`,
        });
      }
    });

    /**
     * Make sure every input_descriptors[x] of the Presentation Definition is
     * satisfied, i.e. there's at least 1 descriptor_map[x] with the same id.
     */
    presentationDefinition.input_descriptors.forEach((inputDescriptor) => {
      const matchingDescriptor = (
        presentationSubmission.descriptor_map || []
      ).find((descriptor) => descriptor.id === inputDescriptor.id);

      if (!matchingDescriptor) {
        throw new OAuth2TokenError("invalid_request", {
          errorDescription: `Input descriptor ${inputDescriptor.id} is missing`,
        });
      }
    });
  }

  /**
   * Checks if the given DID is registered in the DIDR.
   *
   * @param did - The issuer DID to verify.
   * @returns True if the DID is registered, false otherwise.
   */
  async isDidRegistered(did: string): Promise<boolean> {
    try {
      await axios.get(`${this.didRegistry}/${did}`);
    } catch (e) {
      logAxiosError(e, this.logger);
      return false;
    }

    return true;
  }

  async validateTrustedIssuer(
    did: string,
    requireNewUser: boolean,
  ): Promise<void> {
    // Check if the issuer has accreditations
    let issuerRequest: AxiosResponse<unknown>;

    // Request TI attributes
    try {
      issuerRequest = await axios.get<unknown>(
        `${this.trustedIssuersRegistry}/${did}`,
      );
    } catch (e) {
      logAxiosError(e, this.logger);

      if (axios.isAxiosError(e)) {
        if (e.response?.status === 404) {
          throw new OAuth2TokenError("invalid_request", {
            errorDescription: `Invalid Verifiable Presentation: DID ${did} is not registered in the Trusted Issuers Registry`,
          });
        }

        if (e.response?.status === 500) {
          throw new OAuth2TokenError("server_error", {
            errorDescription:
              "Trusted Issuers Registry responded with an internal error",
          });
        }
      }

      // Fallback (should not be triggered)
      throw new OAuth2TokenError("server_error", {
        errorDescription: "Unexpected error",
      });
    }

    // Parse response
    const parsedIssuer = issuerSchema.safeParse(issuerRequest.data);
    if (!parsedIssuer.success) {
      throw new OAuth2TokenError("server_error", {
        errorDescription: "Trusted Issuers Registry sent an invalid response",
      });
    }

    // new users (tir_invite scope) should not have accreditations
    const hasAccreditations = parsedIssuer.data.attributes.some(
      (attribute) => !!attribute.body,
    );
    if (requireNewUser && hasAccreditations) {
      throw new OAuth2TokenError("invalid_request", {
        errorDescription: `Invalid Verifiable Presentation: Trusted Issuer ${did} already has accreditations. Request an access token with scope "tir_write"`,
      });
    }

    // existing users (tir_write scope) should have accreditations
    if (!requireNewUser && !hasAccreditations) {
      throw new OAuth2TokenError("invalid_request", {
        errorDescription: `Invalid Verifiable Presentation: Trusted Issuer ${did} doesn't have accreditations. Request an access token with scope "tir_invite"`,
      });
    }
  }

  async validateTntCreator(did: string): Promise<void> {
    try {
      await axios.head<unknown>(
        `${this.trackAndTraceAccessesEndpoint}?${new URLSearchParams({
          creator: did,
        }).toString()}`,
      );
    } catch (e) {
      logAxiosError(e, this.logger);

      if (axios.isAxiosError(e)) {
        if (e.response?.status === 404) {
          throw new OAuth2TokenError("invalid_request", {
            errorDescription: `Invalid Verifiable Presentation: DID ${did} is not allowlisted as a TnT Document creator`,
          });
        }

        if (e.response?.status === 500) {
          throw new OAuth2TokenError("server_error", {
            errorDescription:
              "Track And Trace API responded with an internal error",
          });
        }
      }

      // Fallback (should not be triggered)
      throw new OAuth2TokenError("server_error", {
        errorDescription: "Unexpected error",
      });
    }
  }

  async createAccessToken(body: unknown): Promise<TokenResponse> {
    // Validate query params (full DTO)
    let parsedDto: CreateAccessTokenDto;
    try {
      parsedDto = parseDto(body, CreateAccessTokenDto);
    } catch (e) {
      // Unknown error during validation
      if (!(e instanceof ClassValidatorError)) {
        throw new OAuth2TokenError("invalid_request", {
          errorDescription: e instanceof Error ? e.message : "Unknown error",
        });
      }

      // Return first error
      const { constraints } = e.validationError;

      if (!constraints) {
        throw new OAuth2TokenError("invalid_request", {
          errorDescription: "unknown error",
        });
      }

      const errorDescription = Object.values(constraints)[0]!;

      throw new OAuth2TokenError("invalid_request", {
        errorDescription,
      });
    }

    const {
      scope,
      vp_token: vpToken,
      presentation_submission: presentationSubmissionString,
    } = parsedDto;

    const unsafePresentationSubmission = JSON.parse(
      presentationSubmissionString,
    );

    const parsedPresentationSubmission = presentationSubmissionSchema.safeParse(
      unsafePresentationSubmission,
    );

    if (!parsedPresentationSubmission.success) {
      const errorDescription = `Invalid Presentation Submission:\n${parsedPresentationSubmission.error.issues
        .map(
          (issue) =>
            `- Validation error. Path: '${[
              "presentation_submission",
              ...issue.path,
            ]
              .filter(Boolean)
              .join(".")}'. Reason: ${issue.message}`,
        )
        .join("\n")}`;

      throw new OAuth2TokenError("invalid_request", {
        errorDescription,
      });
    }

    const presentationSubmission = parsedPresentationSubmission.data;

    let vpTokenDecoded: ReturnType<typeof decodeJWT>;
    try {
      vpTokenDecoded = decodeJWT(vpToken);
    } catch (error) {
      let message = "unknown error";

      if (error instanceof Error) {
        message = error.message;
      }

      throw new OAuth2TokenError("invalid_request", {
        errorDescription: `Invalid Verifiable Presentation: ${message}`,
      });
    }

    const vpTokenPayload = vpTokenDecoded.payload;

    await this.preventReplayAttack(vpTokenPayload);

    // Get Presentation Definition corresponding to the requested scope
    const customScope = scope.split(" ")[1] as (typeof CUSTOM_SCOPES)[number];
    const presentationDefinition = this.getPresentationDefinitions(customScope);

    // Verify presentation_submission object
    this.validatePresentationSubmissionObject(
      presentationSubmission as PresentationSubmission,
      presentationDefinition,
    );

    // Now, we can assert that vpTokenPayload is a VpJwtPayload
    const { vp } = vpTokenPayload as VpJwtPayload;

    // Verify presentation exchange
    this.validatePresentationExchange(
      vp,
      presentationDefinition,
      presentationSubmission as PresentationSubmission,
    );

    // Verify VP JWT
    await this.validateVpJwt(vpToken, customScope === DIDR_INVITE_SCOPE);

    // Additional verifications based on the requested scope

    // `didr_invite`: the client must present a VP containing a valid VerifiableAuthorisationToOnboard VC.
    // This is already done by the PEX library, based on the presentation definition.
    // Verify that the DID is not registered yet.
    if (
      customScope === DIDR_INVITE_SCOPE &&
      (await this.isDidRegistered(vp.holder))
    ) {
      throw new OAuth2TokenError("invalid_request", {
        errorDescription: `Invalid Verifiable Presentation: DID ${vp.holder} is already registered in the DID Registry`,
      });
    }

    // `didr_write`: the client needs to have entry in DIDR / can prove her signature.
    // This is already done in validateVpJwt.

    // `tir_invite`: the client must present a VP containing a valid VerifiableAuthorisationForTrustChain, VerifiableAccreditationToAttest, or VerifiableAccreditationToAccredit.
    // This is already done by the PEX library, based on the presentation definition.
    if (customScope === TIR_INVITE_SCOPE) {
      await this.validateTrustedIssuer(vp.holder, true);
    }

    // `tir_write`: the client needs to be registered as a Trusted Issuer with accreditations.
    if (customScope === TIR_WRITE_SCOPE) {
      await this.validateTrustedIssuer(vp.holder, false);
    }

    // `timestamp_write`: the client needs to have entry in DIDR / can prove her signature.
    // This is already done in validateVpJwt.

    // `tnt_authorise`: the client must present a VP containing a valid VerifiableAuthorisationToOnboard VC issued by an allowlisted entity.
    if (customScope === TNT_AUTHORISE_SCOPE) {
      // TODO: check if VerifiableAuthorisationToOnboard issuer is allowlisted
      // This should be done by the PEX library, based on the presentation definition.
    }

    // `tnt_create`: the client must be an allowlisted TnT Document creator
    if (customScope === TNT_CREATE_SCOPE) {
      await this.validateTntCreator(vp.holder);
    }

    // Generate access token
    const expiresIn = 7200;
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + expiresIn;
    const jwk = await this.getPublicKeyJwk();
    const { kid } = jwk;
    const accessToken = await createJWT(
      {
        sub: vpTokenPayload.sub!, // sub: Legal entity DID
        aud: this.issuer, // aud: Must be equal to 'iss'
        scp: scope, // scp: string of space separated scopes that we granted
        jti: randomUUID(), // jti: A unique random identifier
        iat,
        exp,
      },
      {
        issuer: this.issuer, // iss: HTTPS URL of the Authorisation Server instance. Must equal to hosted domain + suffix.
        signer: ES256Signer(hexToBytes(this.apiES256PrivateKey)),
      },
      {
        alg: "ES256",
        kid,
      },
    );

    /**
     * @see https://openid.net/specs/openid-connect-core-1_0.html#IDToken
     */
    const idToken = await createJWT(
      {
        /**
         * `sub`
         *
         * REQUIRED. Subject Identifier.
         * A locally unique and never reassigned identifier within the Issuer for the End-User, which is intended to be consumed by the Client, e.g., 24400320 or AItOawmwtWwcT0k51BayewNvutrJUqsvl6qs7A4.
         * It MUST NOT exceed 255 ASCII characters in length.
         * The sub value is a case sensitive string.
         */
        sub: vpTokenPayload.iss!,

        /**
         * `aud`
         *
         * REQUIRED. Audience(s) that this ID Token is intended for.
         * It MUST contain the OAuth 2.0 client_id of the Relying Party as an audience value.
         * It MAY also contain identifiers for other audiences.
         * In the general case, the aud value is an array of case sensitive strings.
         * In the common special case when there is one audience, the aud value MAY be a single case sensitive string.
         */
        aud: vpTokenPayload.iss!,

        /**
         * `jti`
         *
         * @see https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1.7
         *
         * The "jti" (JWT ID) claim provides a unique identifier for the JWT.
         * The identifier value MUST be assigned in a manner that ensures that there is a negligible probability that the same value will be accidentally assigned to a different data object; if the application uses multiple issuers, collisions MUST be prevented among value produced by different issuers as well.
         * The "jti" claim can be used to prevent the JWT from being replayed.
         * The "jti" value is a case-sensitive string.
         */
        jti: randomUUID(), // jti: A unique random identifier

        /**
         * `iat`
         *
         * REQUIRED. Time at which the JWT was issued.
         * Its value is a JSON number representing the number of seconds from 1970-01-01T0:0:0Z as measured in UTC until the date/time.
         */
        iat,

        /**
         * `exp`
         *
         * REQUIRED. Expiration time on or after which the ID Token MUST NOT be accepted for processing.
         * The processing of this parameter requires that the current date/time MUST be before the expiration date/time listed in the value.
         * Implementers MAY provide for some small leeway, usually no more than a few minutes, to account for clock skew.
         * Its value is a JSON number representing the number of seconds from 1970-01-01T0:0:0Z as measured in UTC until the date/time.
         */
        exp,

        /**
         * `nonce`
         *
         * String value used to associate a Client session with an ID Token, and to mitigate replay attacks.
         * The value is passed through unmodified from the Authentication Request to the ID Token.
         * If present in the ID Token, Clients MUST verify that the nonce Claim Value is equal to the value of the nonce parameter sent in the Authentication Request. If present in the Authentication Request, Authorization Servers MUST include a nonce Claim in the ID Token with the Claim Value being the nonce value sent in the Authentication Request.
         * Authorization Servers SHOULD perform no other processing on nonce values used. The nonce value is a case sensitive string.
         */
        nonce: vpTokenPayload["nonce"] as string | undefined,
      },
      {
        /**
         * `iss`
         *
         * REQUIRED. Issuer Identifier for the Issuer of the response.
         * The iss value is a case sensitive URL using the https scheme that contains scheme, host, and optionally, port number and path components and no query or fragment components.
         */
        issuer: this.issuer, // iss: HTTPS URL of the Authorisation Server instance. Must equal to hosted domain + suffix.
        signer: ES256Signer(hexToBytes(this.apiES256PrivateKey)),
      },
      {
        alg: "ES256",
        kid,
      },
    );

    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: expiresIn,
      scope,
      id_token: idToken,
    };
  }
}

export default AuthorisationService;
