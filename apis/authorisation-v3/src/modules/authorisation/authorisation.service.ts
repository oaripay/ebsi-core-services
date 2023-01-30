import { JsonWebKey, randomUUID } from "node:crypto";
import { Injectable, Inject, CACHE_MANAGER } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BadRequestError } from "@ebsiint-api/shared";
import type { PresentationSubmission } from "@sphereon/pex-models";
import {
  EbsiVerifiablePresentation,
  verifyPresentationJwt,
  VpJwtPayload,
} from "@cef-ebsi/verifiable-presentation";
import { PEXv2 } from "@sphereon/pex";
import type { IPresentation } from "@sphereon/ssi-types";
import { decodeJWT, createJWT, ES256Signer, hexToBytes } from "did-jwt";
import type { JWTDecoded, JWTPayload } from "did-jwt/lib/JWT";
import { MemoryCache } from "cache-manager";
import type { ApiConfig } from "../../config/configuration";
import type {
  JsonWebKeySet,
  OPMetadata,
  Scope,
  TokenResponse,
} from "./authorisation.interfaces";
import { CreateAccessTokenDto } from "./dto";
import { fromHexToJWK } from "./authorisation.utils";
import {
  DID_WRITE_PRESENTATION_DEFINITION,
  GENERIC_WRITE_PRESENTATION_DEFINITION,
  SUPPORTED_SCOPES,
  TIR_WRITE_PRESENTATION_DEFINITION,
} from "./authorisation.constants";
import { PresentationDefinition } from "../../shared/interfaces/pex";

@Injectable()
export class AuthorisationService {
  private readonly issuer: string;

  private publicKeyJwk: JsonWebKey;

  private readonly ebsiAuthority: string;

  private readonly pex: PEXv2;

  private readonly apiES256PrivateKey: string;

  constructor(
    configService: ConfigService<ApiConfig, true>,
    @Inject(CACHE_MANAGER) private cacheManager: MemoryCache
  ) {
    const domain = configService.get<string>("domain");
    this.ebsiAuthority = domain.replace(/^https?:\/\//, ""); // remove http protocol scheme
    const apiUrlPrefix = configService.get<string>("apiUrlPrefix");
    this.issuer = `${domain}${apiUrlPrefix}`;
    this.apiES256PrivateKey = configService.get<string>("apiES256PrivateKey");
    this.pex = new PEXv2();
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
      pushed_authorization_request_endpoint: `${this.issuer}/par`,
      presentation_definition_endpoint: `${this.issuer}/presentation-definitions`,
      jwks_uri: `${this.issuer}/jwks`,
      scopes_supported: SUPPORTED_SCOPES,
      response_types_supported: ["code"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["none"],
      subject_syntax_types_supported: ["did:ebsi", "did:key"],
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
   * @param scope Array of supported scopes ("openid", "did_write", "tir_write", "generic_write")
   * @returns A Presentation Definition.
   */
  getPresentationDefinitions(scope: Scope[]): PresentationDefinition {
    if (scope.includes("did_write")) {
      return DID_WRITE_PRESENTATION_DEFINITION;
    }

    if (scope.includes("tir_write")) {
      return TIR_WRITE_PRESENTATION_DEFINITION;
    }

    if (scope.includes("generic_write")) {
      return GENERIC_WRITE_PRESENTATION_DEFINITION;
    }

    throw new BadRequestError(BadRequestError.defaultTitle, {
      detail: `Unhandled scope "${scope.join(" ")}"`,
    });
  }

  async preventReplayAttack(payload: JWTPayload) {
    if (!payload.nonce) {
      throw new BadRequestError("Invalid Verifiable Presentation", {
        detail:
          "The vp_token must contain a nonce in order to prevent replay attacks.",
      });
    }

    const cacheKey = payload.nonce as string;
    const nonceUsed = await this.cacheManager.get(cacheKey);
    if (nonceUsed) {
      throw new BadRequestError("Invalid Verifiable Presentation", {
        detail: "The vp_token contains a nonce which has already been used.",
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
    presentationDefinition: PresentationDefinition,
    presentationSubmission: PresentationSubmission
  ) {
    let errorDetails = "";

    const presentation = {
      "@context": vp["@context"],
      type: vp.type,
      holder: vp.holder,
      presentation_submission: presentationSubmission,
      verifiableCredential: vp.verifiableCredential,
    } as IPresentation;

    const { errors } = this.pex.evaluatePresentation(
      presentationDefinition,
      presentation
    );

    errors.forEach((error) => {
      errorDetails += `${error.tag} tag: ${error.message};`;
    });

    if (errors.length > 0) {
      throw new BadRequestError("Invalid Presentation Submission", {
        detail: errorDetails,
      });
    }
  }

  async validateVpJwt(vpToken: string) {
    try {
      const audience = this.issuer;
      const now = Math.floor(Date.now() / 1000);

      await verifyPresentationJwt(vpToken, audience, {
        ebsiAuthority: this.ebsiAuthority,
        validAt: now, // The JWT VC(s) must be valid now
      });
    } catch (e) {
      throw new BadRequestError("Invalid Verifiable Presentation", {
        detail: e instanceof Error ? e.message : "Unknown error",
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
    definitionId: string
  ) {
    const validationResult = this.pex.validateSubmission(
      presentationSubmission
    );

    const checkedArray = Array.isArray(validationResult)
      ? validationResult
      : [validationResult];

    const errors = checkedArray
      .map((checked) => {
        if (checked.status === "error") {
          return checked;
        }
        return null;
      })
      .filter(Boolean);

    if (errors.length > 0) {
      throw new BadRequestError("Invalid Presentation Submission", {
        detail: errors.map((err) => `- [${err.tag}] ${err.message}`).join("\n"),
      });
    }

    /**
     * The presentation_submission object MUST contain a definition_id property.
     * The value of this property MUST be the id value of a valid Presentation Definition.
     *
     * @see https://identity.foundation/presentation-exchange/#presentation-submission
     */
    if (presentationSubmission.definition_id !== definitionId) {
      throw new BadRequestError("Invalid Presentation Submission", {
        detail:
          "definition_id doesn't match the expected Presentation Definition ID for the requested scope",
      });
    }
  }

  async createAccessToken(body: CreateAccessTokenDto): Promise<TokenResponse> {
    const {
      scope,
      vp_token: vpToken,
      presentation_submission: presentationSubmission,
    } = body;

    let vpTokenDecoded: JWTDecoded;
    try {
      vpTokenDecoded = decodeJWT(vpToken);
    } catch (error) {
      let message = "unknown error";

      if (error instanceof Error) {
        message = error.message;
      }

      throw new BadRequestError("Invalid Verifiable Presentation", {
        detail: message,
      });
    }

    const vpTokenPayload = vpTokenDecoded.payload;

    await this.preventReplayAttack(vpTokenPayload);

    // Verify VP JWT
    await this.validateVpJwt(vpToken);

    // Get Presentation Definition corresponding to the requested scope
    const presentationDefinition = this.getPresentationDefinitions(scope);

    // Verify presentation_submission object
    this.validatePresentationSubmissionObject(
      presentationSubmission,
      presentationDefinition.id
    );

    // Now, we can assert that vpTokenPayload is a VpJwtPayload
    const { vp } = vpTokenPayload as VpJwtPayload;

    // Verify presentation exchange
    this.validatePresentationExchange(
      vp,
      presentationDefinition,
      presentationSubmission
    );

    // TODO: Implement additional logic based on scope + VC type

    // https://ec.europa.eu/digital-building-blocks/tracker/browse/EBSIINT-5010
    // did_write -> When VP contains only a valid VerifiableAuthorisationToOnboard, which was issued by Root TAO or TAO.

    // https://ec.europa.eu/digital-building-blocks/tracker/browse/EBSIINT-5011
    // tir_write -> When VP contains a valid VerifiableAuthorisationForTrustChain from EBSI TO, or Verifiable Accreditation (VerifiableAccreditationToAttest, or VerifiableAccreditationToAccredit), which was issued by Root TAO or TAO.

    // https://ec.europa.eu/digital-building-blocks/tracker/browse/EBSIINT-5012
    // generic_write -> Verify that VP holder is a registered Trusted Issuer.

    // Generate access token
    const scopes = scope.join(" ");
    const expiresIn = 7200;
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + expiresIn;
    const jwk = await this.getPublicKeyJwk();
    const { kid } = jwk;
    const accessToken = await createJWT(
      {
        sub: vpTokenPayload.sub, // sub: Legal entity DID
        aud: this.issuer, // aud: Must be equal to 'iss'
        scp: scopes, // scp: string of space separated scopes that we granted
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
      }
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
        sub: vpTokenPayload.iss,

        /**
         * `aud`
         *
         * REQUIRED. Audience(s) that this ID Token is intended for.
         * It MUST contain the OAuth 2.0 client_id of the Relying Party as an audience value.
         * It MAY also contain identifiers for other audiences.
         * In the general case, the aud value is an array of case sensitive strings.
         * In the common special case when there is one audience, the aud value MAY be a single case sensitive string.
         */
        aud: vpTokenPayload.iss,

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
        nonce: vpTokenPayload.nonce as string | undefined,
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
      }
    );

    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: expiresIn,
      scope: scopes,
      id_token: idToken,
    };
  }
}

export default AuthorisationService;
