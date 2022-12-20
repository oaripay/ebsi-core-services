export interface OpenIdConfiguration {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  scopes_supported: string;
  response_types_supported: string;
  response_modes_supported: string;
  grant_types_supported: string;
  subject_types_supported: string;
  id_token_signing_alg_values_supported: string;
  userinfo_signing_alg_values_supported: string;
  request_object_signing_alg_values_supported: string;
  request_parameter_supported: boolean;
  request_uri_parameter_supported: boolean;
}

export default OpenIdConfiguration;
