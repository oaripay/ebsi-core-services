import { JsonWebKey } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ApiConfig } from "../../config/configuration";
import type { JsonWebKeySet, OPMetadata } from "./authorisation.interfaces";
import { fromHexToJwk } from "./authorisation.utils";

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
      jwks_uri: `${this.issuer}/jwks`,
      scopes_supported: [
        "openid",
        // TODO: uncomment the following scopes once they're supported
        // "did_write",
        // "tir_write",
        // "generic_write",
      ],
      response_types_supported: ["code"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["none"],
      subject_syntax_types_supported: ["did:ebsi", "did:ebsinp"],
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
      this.publicKey = fromHexToJwk(hexPrivateKey);
    }

    // Return JWKS
    return {
      keys: [this.publicKey],
    };
  }
}

export default AuthorisationService;
