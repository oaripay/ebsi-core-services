enum OnboardingErrors {
  ERROR_EUTICKET_VALIDATION = "Error on validating the EU Login ticket",
  ERROR_EUTICKET_PARSE = "Error on parsing EU Ticket validation response",
  ERROR_SIGNATURE_AUTHENTICATION_RESPONSE = "The signature found in response id token is not valid",
  MISSING_SUB_JWK = "sub_jwk missing in token payload",
}
enum AuthenticationErrors {
  INVALID_SCOPE = "Invalid scope",
  ID_TOKEN_MISSING = "ID Token is missing",
  ERROR_AUTHENTICATION_REQUEST = "Error generating the authentication request",
}
export { OnboardingErrors, AuthenticationErrors };
