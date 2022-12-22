import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ApiConfig } from "../../config/configuration";
import type { OPMetadata } from "./authorisation.interfaces";

@Injectable()
export class AuthorisationService {
  private issuer: string;

  constructor(configService: ConfigService<ApiConfig, true>) {
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
      response_types_supported: ["vp_token code"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["none"],
      subject_syntax_types_supported: ["did:ebsi", "did:ebsinp"],
    };
  }
}

export default AuthorisationService;
