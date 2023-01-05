import { JsonWebKey } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BadRequestError } from "@cef-ebsi/problem-details-errors";
import type { PresentationDefinitionV2 } from "@sphereon/pex-models";
import type { ApiConfig } from "../../config/configuration";
import type {
  JsonWebKeySet,
  OPMetadata,
  Scope,
} from "./authorisation.interfaces";
import { fromHexToJWK } from "./authorisation.utils";

@Injectable()
export class AuthorisationService {
  private issuer: string;

  private publicKey: JsonWebKey;

  constructor(private configService: ConfigService<ApiConfig, true>) {
    const domain = configService.get<string>("domain");
    const apiUrlPrefix = configService.get<string>("apiUrlPrefix");
    this.issuer = `${domain}${apiUrlPrefix}`;
  }

  getOPMetadata(): OPMetadata {
    return {
      issuer: this.issuer,
      authorization_endpoint: `${this.issuer}/authorize`,
      token_endpoint: `${this.issuer}/token`,
      pushed_authorization_request_endpoint: `${this.issuer}/par`,
      presentation_definition_endpoint: `${this.issuer}/presentation-definitions`,
      jwks_uri: `${this.issuer}/jwks`,
      scopes_supported: [
        "openid",
        // TODO: implement in https://ec.europa.eu/digital-building-blocks/tracker/browse/EBSIINT-5010
        // "did_write",
        // TODO: implement in https://ec.europa.eu/digital-building-blocks/tracker/browse/EBSIINT-5011
        // "tir_write",
        // TODO: implement in https://ec.europa.eu/digital-building-blocks/tracker/browse/EBSIINT-5012
        // "generic_write",
      ],
      response_types_supported: ["code"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["none"],
      subject_syntax_types_supported: [
        "did:ebsi",
        // TODO: remove `did:ebsinp` as soon as it's officially replaced by did:key
        "did:ebsinp",
      ],
    };
  }

  /**
   * Load OP's ES256 signing key from environment and return it as JWK.
   * Note: in the future, the keys will be dynamically generated and rolled every X minutes.
   *
   * @returns The OP's JWKS
   */
  getJwks(): JsonWebKeySet {
    if (!this.publicKey) {
      const hexPrivateKey =
        this.configService.get<string>("apiES256PrivateKey");
      this.publicKey = fromHexToJWK(hexPrivateKey);
    }

    // Return JWKS
    return {
      keys: [this.publicKey],
    };
  }

  /**
   * Return a Presentation Definition articulating what proofs the OP requires.
   *
   * Specs:
   * - https://identity.foundation/presentation-exchange/spec/v2.0.0/#presentation-definition
   * - https://ec.europa.eu/digital-building-blocks/wikis/pages/viewpage.action?spaceKey=BLOCKCHAININT&title=RFC+-+EBSI+Platform+Identity+and+Access+Management#RFCEBSIPlatformIdentityandAccessManagement-ServicetoService-TokenFlow
   *
   * @param scope One of the supported scopes ("openid", "did_write", "tir_write", "generic_write")
   * @returns A Presentation Definition.
   */
  getPresentationDefinitions(scope: Scope): PresentationDefinitionV2 {
    if (scope === "openid") {
      // Present any EBSI Verifiable Attestation
      return {
        id: "openid_presentation",
        input_descriptors: [
          {
            id: "Any type of Verifiable Attestation",
            name: "Any type of Verifiable Attestation",
            purpose: "Please present a valid Verifiable Attestation",
            constraints: {
              fields: [
                {
                  path: ["$.vc.credentialSchema.id"],
                  filter: {
                    type: "string",
                    pattern: this.configService.get<string>("oidSchemaPattern"),
                  },
                },
              ],
            },
          },
        ],
        format: {
          jwt_vc: {
            alg: ["ES256", "ES256K"],
          },
          jwt_vp: {
            alg: ["ES256", "ES256K"],
          },
        },
      };
    }

    if (scope === "did_write") {
      // TODO: implement in https://ec.europa.eu/digital-building-blocks/tracker/browse/EBSIINT-5010
      return {
        id: "did_write_presentation",
        input_descriptors: [],
      };
    }
    // TODO: implement in https://ec.europa.eu/digital-building-blocks/tracker/browse/EBSIINT-5011
    if (scope === "tir_write") {
      return {
        id: "tir_write_presentation",
        input_descriptors: [],
      };
    }

    // TODO: implement in https://ec.europa.eu/digital-building-blocks/tracker/browse/EBSIINT-5012
    if (scope === "generic_write") {
      return {
        id: "generic_write_presentation",
        input_descriptors: [],
      };
    }

    // In theory, this should never happen
    throw new BadRequestError(BadRequestError.defaultTitle, {
      detail: "Unhandled scope",
    });
  }
}

export default AuthorisationService;
