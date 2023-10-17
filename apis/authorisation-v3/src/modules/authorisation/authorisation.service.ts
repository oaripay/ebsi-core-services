import { JsonWebKey, randomUUID } from "node:crypto";
import { Injectable, Inject, Logger } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { ConfigService } from "@nestjs/config";
import type { ReadonlyDeep } from "type-fest";
import { logAxiosError } from "@ebsiint-api/shared";
import type { PresentationSubmission } from "@sphereon/pex-models";
import { verifyPresentationJwt } from "@cef-ebsi/verifiable-presentation";
import type {
  EbsiVerifiablePresentation,
  EbsiVpEnvConfiguration,
  VpJwtPayload,
} from "@cef-ebsi/verifiable-presentation";
import { PEXv2 } from "@sphereon/pex";
import type { Checked } from "@sphereon/pex";
import type { IPresentation, IVerifiableCredential } from "@sphereon/ssi-types";
import { decodeJWT, createJWT, ES256Signer, hexToBytes } from "did-jwt";
import type { JWTPayload } from "did-jwt";
import type { MemoryCache } from "cache-manager";
import axios, { type AxiosResponse } from "axios";
import type { ApiConfig } from "../../config/configuration.js";
import type {
  JsonWebKeySet,
  OPMetadata,
  TokenResponse,
} from "./authorisation.interfaces.js";
import { CreateAccessTokenDto } from "./dto/index.js";
import { fromHexToJWK, parseDto } from "./authorisation.utils.js";
import {
  DIDR_INVITE_PRESENTATION_DEFINITION,
  DIDR_WRITE_PRESENTATION_DEFINITION,
  TIR_INVITE_PRESENTATION_DEFINITION,
  TIR_WRITE_PRESENTATION_DEFINITION,
  SUPPORTED_SCOPES,
  DIDR_INVITE_SCOPE,
  DIDR_WRITE_SCOPE,
  TIR_INVITE_SCOPE,
  TIR_WRITE_SCOPE,
  CUSTOM_SCOPES,
} from "./authorisation.constants.js";
import type { PresentationDefinition } from "../../shared/interfaces/pex.js";
import {
  attributesSchema,
  revisionsSchema,
  presentationSubmissionSchema,
} from "./validators/index.js";
import { ClassValidatorError, OAuth2TokenError } from "./errors/index.js";

@Injectable()
export class AuthorisationService {
  private readonly logger = new Logger(AuthorisationService.name);

  private readonly issuer: string;

  private publicKeyJwk?: JsonWebKey;

  private readonly ebsiAuthority: string;

  private readonly ebsiEnvConfig: EbsiVpEnvConfiguration;

  private readonly apiES256PrivateKey: string;

  private readonly didRegistry: string;

  private readonly trustedIssuersRegistry: string;

  private readonly trustedHostnames: string[];

  constructor(
    configService: ConfigService<ApiConfig, true>,
    @Inject(CACHE_MANAGER) private cacheManager: MemoryCache,
  ) {
    const domain = configService.get<string>("domain");
    this.ebsiAuthority = domain.replace(/^https?:\/\//, ""); // remove http protocol scheme
    this.ebsiEnvConfig = {
      didRegistry: `${domain}/did-registry/v4/identifiers`,
      trustedIssuersRegistry: `${domain}/trusted-issuers-registry/v4/issuers`,
      trustedPoliciesRegistry: `${domain}/trusted-policies-registry/v2/users`,
    };
    const apiUrlPrefix = configService.get<string>("apiUrlPrefix");
    this.issuer = `${domain}${apiUrlPrefix}`;
    this.didRegistry = configService.get<string>("didRegistry");
    this.trustedIssuersRegistry = configService.get<string>(
      "trustedIssuersRegistry",
    );
    this.apiES256PrivateKey = configService.get<string>("apiES256PrivateKey");
    this.trustedHostnames = configService.get<string[]>("trustedHostnames");
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
   * @param scope Array of supported scopes ("openid", "didr_invite", "didr_write", "tir_invite", "tir_write")
   * @returns A Presentation Definition.
   */
  getPresentationDefinitions(scope: (typeof CUSTOM_SCOPES)[number]) {
    if (scope === DIDR_INVITE_SCOPE) {
      return DIDR_INVITE_PRESENTATION_DEFINITION;
    }

    if (scope === DIDR_WRITE_SCOPE) {
      return DIDR_WRITE_PRESENTATION_DEFINITION;
    }

    if (scope === TIR_INVITE_SCOPE) {
      return TIR_INVITE_PRESENTATION_DEFINITION;
    }

    if (scope === TIR_WRITE_SCOPE) {
      return TIR_WRITE_PRESENTATION_DEFINITION;
    }

    throw new OAuth2TokenError("invalid_request", {
      errorDescription: `Unhandled scope "${scope as string}"`,
    });
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
        validAt: now, // The JWT VC(s) must be valid now
        skipHolderDidResolutionValidation: isDidUnresolvable,
        skipSignatureValidation: isDidUnresolvable,
        validateAccreditationWithoutTermsOfUse: true, // The VC must contain terms of use (or be self-accredited)
        trustedHostnames: this.trustedHostnames,
        ebsiEnvConfig: this.ebsiEnvConfig,
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
    // 1. Check if the issuer has exactly 1 attribute
    let attributesRequest: AxiosResponse<unknown>;

    // 1.a Request TI attributes
    try {
      attributesRequest = await axios.get<unknown>(
        `${this.trustedIssuersRegistry}/${did}/attributes`,
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

    // 1.b Parse response
    const parsedAttributes = attributesSchema.safeParse(attributesRequest.data);
    if (!parsedAttributes.success) {
      throw new OAuth2TokenError("server_error", {
        errorDescription: "Trusted Issuers Registry sent an invalid response",
      });
    }

    // 1.c If the issuer has more than 1 attribute:
    // - return an error if requireNewUser=true
    // - consider the Trusted Issuer as accredited (return early)
    if (parsedAttributes.data.items.length !== 1) {
      if (requireNewUser) {
        throw new OAuth2TokenError("invalid_request", {
          errorDescription: `Invalid Verifiable Presentation: Trusted Issuer ${did} already has multiple attributes`,
        });
      }

      // The Trusted Issuer has multiple attributes. Exit early.
      return;
    }

    // 2. If the TI has exactly 1 attribute, check if the attribute has exactly 1 revision
    const attribute = parsedAttributes.data.items[0]!;
    let revisionsRequest: AxiosResponse<unknown>;

    // 2.a Request attribute revisions
    try {
      revisionsRequest = await axios.get<unknown>(
        `${attribute.href}/revisions`,
      );
    } catch (e) {
      logAxiosError(e, this.logger);

      if (axios.isAxiosError(e)) {
        if (e.response?.status === 404) {
          throw new OAuth2TokenError("invalid_request", {
            errorDescription: `Invalid Verifiable Presentation: Attribute ${attribute.id} from Trusted Issuer ${did} can't be found`,
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

    // 2.b Parse response
    const parsedRevisions = revisionsSchema.safeParse(revisionsRequest.data);
    if (!parsedRevisions.success) {
      throw new OAuth2TokenError("server_error", {
        errorDescription: "Trusted Issuers Registry sent an invalid response",
      });
    }

    // 2.c If the attribute has more than 1 revision:
    // - return an error if requireNewUser=true
    // - consider the Trusted Issuer as accredited
    if (parsedRevisions.data.items.length !== 1 && requireNewUser) {
      throw new OAuth2TokenError("invalid_request", {
        errorDescription: `Invalid Verifiable Presentation: Trusted Issuer ${did} already has accreditations`,
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

      const errorDescription = Object.values(constraints)[0];

      throw new OAuth2TokenError("invalid_request", {
        ...(errorDescription && { errorDescription }),
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
