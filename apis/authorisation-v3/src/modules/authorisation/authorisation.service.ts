import type {
  EbsiVerifiablePresentation,
  EbsiVpEnvConfiguration,
  VpJwtPayload,
} from "@cef-ebsi/verifiable-presentation";
import type { Checked } from "@sphereon/pex";
import type { PresentationSubmission } from "@sphereon/pex-models";
import type { IPresentation, IVerifiableCredential } from "@sphereon/ssi-types";
import type { MemoryCache } from "cache-manager";
import type { JWTPayload } from "did-jwt";
import type { ReadonlyDeep } from "type-fest";

import { verifyPresentationJwt } from "@cef-ebsi/verifiable-presentation";
import { getPublicKeyJwk, logAxiosError } from "@ebsiint-api/shared";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PEXv2 } from "@sphereon/pex";
import axios, { type AxiosResponse, isAxiosError } from "axios";
import { createJWT, decodeJWT, ES256Signer, hexToBytes } from "did-jwt";
import { JsonWebKey, randomUUID } from "node:crypto";

import type { ApiConfig } from "../../config/configuration.js";
import type { PresentationDefinition } from "../../shared/interfaces/pex.js";
import type {
  JsonWebKeySet,
  OPMetadata,
  TokenResponse,
} from "./authorisation.interfaces.js";

import {
  CUSTOM_SCOPES,
  DIDR_INVITE_PRESENTATION_DEFINITION,
  DIDR_INVITE_SCOPE,
  DIDR_WRITE_PRESENTATION_DEFINITION,
  DIDR_WRITE_SCOPE,
  SUPPORTED_SCOPES,
  TIR_INVITE_PRESENTATION_DEFINITION,
  TIR_INVITE_SCOPE,
  TIR_WRITE_PRESENTATION_DEFINITION,
  TIR_WRITE_SCOPE,
} from "./authorisation.constants.js";
import { parseDto } from "./authorisation.utils.js";
import { CreateAccessTokenDto } from "./dto/index.js";
import { ClassValidatorError, OAuth2TokenError } from "./errors/index.js";
import {
  issuerSchema,
  presentationSubmissionSchema,
} from "./validators/index.js";

@Injectable()
export class AuthorisationService {
  private readonly apiES256PrivateKey: Uint8Array;

  private readonly didRegistry: string;

  private readonly ebsiEnvConfig: EbsiVpEnvConfiguration;

  private readonly issuer: string;

  private readonly logger = new Logger(AuthorisationService.name);

  private publicKeyJwk?: JsonWebKey;

  private readonly trustedIssuersRegistry: string;

  constructor(
    configService: ConfigService<ApiConfig, true>,
    @Inject(CACHE_MANAGER) private cacheManager: MemoryCache,
  ) {
    this.ebsiEnvConfig = configService.get("ebsiEnvConfig");
    const apiUrlPrefix = configService.get("apiUrlPrefix", { infer: true });
    const domain = configService.get("domain", { infer: true });
    this.issuer = `${domain}${apiUrlPrefix}`;
    this.didRegistry = `${domain}/did-registry/${this.ebsiEnvConfig.services["did-registry"]}/identifiers`;
    this.trustedIssuersRegistry = `${domain}/trusted-issuers-registry/${this.ebsiEnvConfig.services["trusted-issuers-registry"]}/issuers`;
    this.apiES256PrivateKey = hexToBytes(
      configService.get("apiES256PrivateKey", { infer: true }),
    );
  }

  async createAccessToken(body: unknown): Promise<TokenResponse> {
    // Validate query params (full DTO)
    let parsedDto: CreateAccessTokenDto;
    try {
      parsedDto = parseDto(body, CreateAccessTokenDto);
    } catch (error) {
      // Unknown error during validation
      if (!(error instanceof ClassValidatorError)) {
        throw new OAuth2TokenError("invalid_request", {
          errorDescription:
            error instanceof Error ? error.message : "Unknown error",
        });
      }

      // Return first error
      const { constraints } = error.validationError;

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
      presentation_submission: presentationSubmissionString,
      scope,
      vp_token: vpToken,
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
        aud: this.issuer, // aud: Must be equal to 'iss'
        exp,
        iat,
        jti: randomUUID(), // jti: A unique random identifier
        scp: scope, // scp: string of space separated scopes that we granted
        sub: vpTokenPayload.sub!, // sub: Legal entity DID
      },
      {
        issuer: this.issuer, // iss: HTTPS URL of the Authorisation Server instance. Must equal to hosted domain + suffix.
        signer: ES256Signer(this.apiES256PrivateKey),
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
         * `exp`
         *
         * REQUIRED. Expiration time on or after which the ID Token MUST NOT be accepted for processing.
         * The processing of this parameter requires that the current date/time MUST be before the expiration date/time listed in the value.
         * Implementers MAY provide for some small leeway, usually no more than a few minutes, to account for clock skew.
         * Its value is a JSON number representing the number of seconds from 1970-01-01T0:0:0Z as measured in UTC until the date/time.
         */
        exp,

        /**
         * `iat`
         *
         * REQUIRED. Time at which the JWT was issued.
         * Its value is a JSON number representing the number of seconds from 1970-01-01T0:0:0Z as measured in UTC until the date/time.
         */
        iat,

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
         * `nonce`
         *
         * String value used to associate a Client session with an ID Token, and to mitigate replay attacks.
         * The value is passed through unmodified from the Authentication Request to the ID Token.
         * If present in the ID Token, Clients MUST verify that the nonce Claim Value is equal to the value of the nonce parameter sent in the Authentication Request. If present in the Authentication Request, Authorization Servers MUST include a nonce Claim in the ID Token with the Claim Value being the nonce value sent in the Authentication Request.
         * Authorization Servers SHOULD perform no other processing on nonce values used. The nonce value is a case sensitive string.
         */
        nonce: vpTokenPayload["nonce"] as string | undefined,

        /**
         * `sub`
         *
         * REQUIRED. Subject Identifier.
         * A locally unique and never reassigned identifier within the Issuer for the End-User, which is intended to be consumed by the Client, e.g., 24400320 or AItOawmwtWwcT0k51BayewNvutrJUqsvl6qs7A4.
         * It MUST NOT exceed 255 ASCII characters in length.
         * The sub value is a case sensitive string.
         */
        sub: vpTokenPayload.iss!,
      },
      {
        /**
         * `iss`
         *
         * REQUIRED. Issuer Identifier for the Issuer of the response.
         * The iss value is a case sensitive URL using the https scheme that contains scheme, host, and optionally, port number and path components and no query or fragment components.
         */
        issuer: this.issuer, // iss: HTTPS URL of the Authorisation Server instance. Must equal to hosted domain + suffix.
        signer: ES256Signer(this.apiES256PrivateKey),
      },
      {
        alg: "ES256",
        kid,
      },
    );

    return {
      access_token: accessToken,
      expires_in: expiresIn,
      id_token: idToken,
      scope,
      token_type: "Bearer",
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

  getOPMetadata(): OPMetadata {
    return {
      authorization_endpoint: `${this.issuer}/authorize`,
      grant_types_supported: ["vp_token"],
      id_token_signing_alg_values_supported: ["none"],
      id_token_types_supported: ["subject_signed_id_token"],
      issuer: this.issuer,
      jwks_uri: `${this.issuer}/jwks`,
      presentation_definition_endpoint: `${this.issuer}/presentation-definitions`,
      response_types_supported: ["token"],
      scopes_supported: SUPPORTED_SCOPES,
      subject_syntax_types_supported: ["did:ebsi", "did:key"],
      subject_trust_frameworks_supported: ["ebsi"],
      subject_types_supported: ["public"],
      token_endpoint: `${this.issuer}/token`,
      token_endpoint_auth_methods_supported: ["private_key_jwt"],
      vp_formats_supported: {
        jwt_vc: { alg_values_supported: ["ES256"] },
        jwt_vp: { alg_values_supported: ["ES256"] },
      },
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

  /**
   * Checks if the given DID is registered in the DIDR.
   *
   * @param did - The issuer DID to verify.
   * @returns True if the DID is registered, false otherwise.
   */
  async isDidRegistered(did: string): Promise<boolean> {
    try {
      await axios.get(`${this.didRegistry}/${did}`);
    } catch (error) {
      if (isAxiosError(error)) {
        logAxiosError(error, this.logger, 500);
      } else if (error instanceof Error) {
        this.logger.error(error.message, error.stack);
      } else {
        this.logger.error(error);
      }

      return false;
    }

    return true;
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
    for (const descriptor of presentationSubmission.descriptor_map) {
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
        holder: vp.holder,
        presentation_submission: presentationSubmission,
        type: vp.type,
        verifiableCredential:
          vp.verifiableCredential as unknown as IVerifiableCredential[],
      } satisfies IPresentation;

      try {
        const pex = new PEXv2();
        const result = pex.evaluatePresentation(
          trimmedPresentationDefinition as Parameters<
            PEXv2["evaluatePresentation"]
          >[0],
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
    }

    if (errors && errors.length > 0) {
      throw new OAuth2TokenError("invalid_request", {
        errorDescription: `Invalid Presentation Submission:\n${errors
          .map(
            (error) => `${error.tag} tag: ${error.message ?? "Unknown error"};`,
          )
          .join(",")}`,
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
          return false;
        }

        if (checked.status === "error") {
          return checked;
        }

        return false;
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
    for (const descriptor of presentationSubmission.descriptor_map || []) {
      const matchingDescriptor = presentationDefinition.input_descriptors.find(
        (inputDescriptor) => inputDescriptor.id === descriptor.id,
      );

      if (!matchingDescriptor) {
        throw new OAuth2TokenError("invalid_request", {
          errorDescription: `The presentation definition doesn't contain any input descriptor with the ID ${descriptor.id}`,
        });
      }
    }

    /**
     * Make sure every input_descriptors[x] of the Presentation Definition is
     * satisfied, i.e. there's at least 1 descriptor_map[x] with the same id.
     */
    for (const inputDescriptor of presentationDefinition.input_descriptors) {
      const matchingDescriptor = (
        presentationSubmission.descriptor_map || []
      ).find((descriptor) => descriptor.id === inputDescriptor.id);

      if (!matchingDescriptor) {
        throw new OAuth2TokenError("invalid_request", {
          errorDescription: `Input descriptor ${inputDescriptor.id} is missing`,
        });
      }
    }
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
    } catch (error) {
      if (isAxiosError(error)) {
        logAxiosError(error, this.logger, 500);

        if (error.response?.status === 404) {
          throw new OAuth2TokenError("invalid_request", {
            errorDescription: `Invalid Verifiable Presentation: DID ${did} is not registered in the Trusted Issuers Registry`,
          });
        }

        if (error.response?.status === 500) {
          throw new OAuth2TokenError("server_error", {
            errorDescription:
              "Trusted Issuers Registry responded with an internal error",
          });
        }
      } else if (error instanceof Error) {
        this.logger.error(error.message, error.stack);
      } else {
        this.logger.error(error);
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

      await verifyPresentationJwt(vpToken, audience, this.ebsiEnvConfig, {
        skipHolderDidResolutionValidation: isDidUnresolvable,
        skipSignatureValidation: isDidUnresolvable,
        validAt: now, // The JWT VC(s) must be valid now
        validateAccreditationWithoutTermsOfUse: true, // The VC must contain terms of use (or be self-accredited)
      });
    } catch (error) {
      throw new OAuth2TokenError("invalid_request", {
        errorDescription: `Invalid Verifiable Presentation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  }

  /**
   * Load OP's ES256 signing key from environment and return it as JWK.
   * Note: in the future, the keys will be dynamically generated and rolled every X minutes.
   *
   * @returns The public key JWK (including "kid")
   */
  private async getPublicKeyJwk() {
    if (!this.publicKeyJwk) {
      this.publicKeyJwk = await getPublicKeyJwk(
        this.apiES256PrivateKey,
        "ES256",
      );
    }

    return this.publicKeyJwk;
  }
}

export default AuthorisationService;
