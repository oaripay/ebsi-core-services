import axios from "axios";
import jose from "jose";
import express from "express";
import {
  IssuerNotFoundError,
  InvalidTokenError,
  InvalidAppError,
  BadRequestError,
} from "../errors";
import * as config from "../config";
import { util } from "../utils";
import AuthManager from "../libs/authManager/authManager";
import {
  AccessTokenResponseBody,
  TOKEN_TYPE,
  ComponentAuthNToken,
  AccessTokenRequestBody,
  JWTClaims,
} from "../libs/authManager/secureEnclave/jwt";
import { PRINT_ERROR } from "../utils/util";

const GRANT_TYPE = "urn:ietf:params:oauth:grant-type:jwt-bearer";

/*
 * Generate a new token for the client
 */
async function generateComponentToken(aud: string): Promise<string> {
  const payload = {
    iss: config.API_NAME,
    aud,
  };
  const token = await AuthManager.Instance.createAuthorizationToken(payload);
  return token;
}

/*
 * Generates a new access Response Token
 */
function generateAccessTokenResponseBody(
  token: string
): AccessTokenResponseBody {
  return {
    accessToken: token,
    tokenType: TOKEN_TYPE.bearer,
    expiresIn: 900, // 15 minutes
    issuedAt: Date.now(),
  };
}

async function getPublicKey(appName: string): Promise<string> {
  const url = `${config.trustedAppsRegistry}/apps/${appName}`;
  let response;
  try {
    util.PRINT_INFO(`Accesing ${url}`);
    response = await axios.get(url);
  } catch (error) {
    if (error.response.status >= 500)
      error.response.data = `Trusted Apps Registry: ${error.response.data}`;
    throw new IssuerNotFoundError(error.response.data);
  }

  if (!response.data.pubKey) {
    throw new IssuerNotFoundError(
      `'${appName}' not found in the list of trusted apps`
    );
  }

  const base64pubkey = response.data.pubKey;
  const publicKeyPEM = Buffer.from(base64pubkey, "base64").toString("utf8");
  return publicKeyPEM;
}

/*
 * Trusted Apps Registry Validation
 * - Verify that {appName} is a trusted app
 * - Verify the signature using the public key in the registry
 * - Verify that {appName} is authorized to use the API
 */
async function trustedAppsRegistryValidation(appName: string, token: string) {
  const publicKeyPEM = await getPublicKey(appName);

  try {
    jose.JWT.verify(token, publicKeyPEM);
  } catch (error) {
    throw new InvalidTokenError(error.message);
  }

  const url = `${config.trustedAppsRegistry}/apps/${config.API_NAME}/authorized-apps/${appName}`;
  try {
    util.PRINT_INFO(`Accesing ${url}`);
    await axios.get(url);
  } catch (error) {
    if (error.response.status >= 500)
      error.response.data = `Trusted Apps Registry: ${error.response.data}`;
    throw new InvalidAppError(error.response.data);
  }
}

/*
 * Create a new session
 *
 * This function validates a self signed token issued by the user,
 * checks the trusted apps registry and generates a session token.
 */
async function newComponentSession(
  token: string
): Promise<AccessTokenResponseBody> {
  const payload = jose.JWT.decode(token) as ComponentAuthNToken;
  if (!payload.aud || !payload.iss || !payload.iat || !payload.exp) {
    throw new InvalidTokenError(
      "The token requires iss, aud, iat, and exp in the payload"
    );
  }

  // verify audience
  if (payload.aud !== config.API_NAME) {
    throw new InvalidTokenError(
      `The aud in the token must be ${config.API_NAME}`
    );
  }

  const appName = payload.iss;
  await trustedAppsRegistryValidation(appName, token);

  const result = await generateComponentToken(payload.iss);
  const sessionToken = generateAccessTokenResponseBody(result);
  return sessionToken;
}

/*
 * Functions for the Router
 */

/*
 * Get the token from the headers
 */
function getToken(req: express.Request) {
  util.PRINT_DEBUG("headers");
  util.PRINT_DEBUG(req.headers);
  const token = req.headers.authorization;
  util.PRINT_DEBUG("token");
  util.PRINT_DEBUG(token);
  if (token) return token.replace("Bearer ", "");
  return null;
}

/*
 * Handle token
 */
async function handleToken(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const token = getToken(req);

  if (!token) {
    // No token in the headers. Continue the call as unauthenticated user
    util.PRINT_DEBUG(`token: Token not present in the headers`);
    Object.assign(req.params, { authenticated: false });
    next();
    return;
  }

  const payload = jose.JWT.decode(token) as JWTClaims;
  if (
    payload.aud !== config.API_NAME &&
    payload.aud !== config.EBSI_APPS.WALLET // supports AuthZ tokens from wallet
  ) {
    next(
      new InvalidTokenError(
        `Token with incorrect audience. Please create a new session with '${config.API_NAME}'`
      )
    );
    return;
  }

  const publicKeyPEM = await getPublicKey(payload.aud);
  try {
    jose.JWT.verify(token, publicKeyPEM);
  } catch (error) {
    PRINT_ERROR(error);
    next(new InvalidTokenError(`Error verifying token: ${error.message}`));
    return;
  }

  util.PRINT_DEBUG(`token: Valid token`);
  Object.assign(req.params, { authenticated: true });
  next();
}

/*
 * Call new session
 */
async function callNewSession(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const accessToken: AccessTokenRequestBody = req.body;
  try {
    if (accessToken.grantType !== GRANT_TYPE)
      throw new BadRequestError(`grantType must be '${GRANT_TYPE}'`);

    if (!accessToken.assertion)
      throw new BadRequestError("No assertion present in the body");

    const result = await newComponentSession(accessToken.assertion);
    res.send(result);
  } catch (error) {
    next(error);
  }
}

export { handleToken, callNewSession };
