enum OnboardingErrors {
  UNSUPPORTED_ONBOARDING = "No supported onboarding methods were provided. Available onboarding: eu-login or recaptcha.",
  EUTICKET_NOT_RESOLVED = "Error on retrieving EU Login ticket to validate",
  ERROR_EUTICKET_VALIDATION = "Error on validating the EU Login ticket",
  ERROR_EUTICKET_PARSE = "Error on parsing EU Ticket validation response",
  ERROR_SIGNATURE_AUTHENTICATION_RESPONSE = "The signature found in response id token is not valid",
  MISSING_SUB_JWK = "sub_jwk missing in token payload",
  VALIDATION_FAILED = "validation failed",
  ERROR_RECAPTCHA_VALIDATION = "provided recaptcha response validation failed",
}
enum AuthenticationErrors {
  INVALID_SCOPE = "Invalid scope",
  ID_TOKEN_MISSING = "ID Token is missing",
  ERROR_AUTHENTICATION_REQUEST = "Error generating the authentication request",
}
export { OnboardingErrors, AuthenticationErrors };
