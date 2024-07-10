import {
  OAuth2Error,
  OAuth2ErrorCode,
  OAuth2ErrorOptions,
} from "./OAuth2Error.js";

/**
 * OAuth2 Token Error
 * https://www.rfc-editor.org/rfc/rfc6749.html#section-5.2
 */
export type OAuth2TokenErrorCode =
  | OAuth2ErrorCode
  /**
   * Client authentication failed (e.g., unknown client, no client authentication included, or
   * unsupported authentication method).  The authorization server MAY return an HTTP 401
   * (Unauthorized) status code to indicate which HTTP authentication schemes are supported. If the
   * client attempted to authenticate via the "Authorization" request header field, the
   * authorization server MUST respond with an HTTP 401 (Unauthorized) status code and include the
   * "WWW-Authenticate" response header field matching the authentication scheme used by the
   * client.
   */
  | "invalid_client"
  /**
   * The provided authorization grant (e.g., authorization code, resource owner credentials) or
   * refresh token is invalid, expired, revoked, does not match the redirection URI used in the
   * authorization request, or was issued to another client.
   */
  | "invalid_grant"
  /**
   * The authenticated client is not authorized to use this authorization grant type.
   */
  | "unauthorized_client"
  /**
   * The authorization grant type is not supported by the authorization server.
   */
  | "unsupported_grant_type"
  /**
   * The requested scope is invalid, unknown, malformed, or exceeds the scope granted by the
   * resource owner.
   */
  | "invalid_scope";

export class OAuth2TokenError extends OAuth2Error<OAuth2TokenErrorCode> {
  constructor(errorCode: OAuth2TokenErrorCode, options?: OAuth2ErrorOptions) {
    super(errorCode, options);
    this.name = "OAuth2TokenError";
  }
}

export default OAuth2TokenError;
