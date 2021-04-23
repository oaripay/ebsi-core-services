enum OnboardingErrors {
  ERROR_EUTICKET_VALIDATION = "Error on validating the EU Login ticket",
  ERROR_EUTICKET_PARSE = "Error on parsing EU Ticket validation response",
}
enum AuthenticationErrors {
  UNKNOWN_SCOPE = "Unknown scope",
  ERROR_AUTHENTICATION_REQUEST = "Error generating the authentication request",
}
export { OnboardingErrors, AuthenticationErrors };
