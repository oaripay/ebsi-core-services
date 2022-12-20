import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ApiConfig } from "../../config/configuration";
import type { OpenIdConfiguration } from "./authorisation.interfaces";

@Injectable()
export class AuthorisationService {
  private apiDid: string;

  constructor(configService: ConfigService<ApiConfig, true>) {
    this.apiDid = configService.get<string>("apiDid");
  }

  getOpenIdConfiguration(): OpenIdConfiguration {
    return {
      issuer: this.apiDid,
      authorization_endpoint: "",
      token_endpoint: "",
      userinfo_endpoint: "",
      jwks_uri: "",
      scopes_supported: "",
      response_types_supported: "",
      response_modes_supported: "",
      grant_types_supported: "",
      subject_types_supported: "",
      id_token_signing_alg_values_supported: "",
      userinfo_signing_alg_values_supported: "",
      request_object_signing_alg_values_supported: "",
      request_parameter_supported: true,
      request_uri_parameter_supported: true,
    };
  }
}

export default AuthorisationService;
