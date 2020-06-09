import jose from "jose";
import express from "express";
import { InvalidTokenError } from "../errors";
import * as config from "../config";
import { util, getSession } from "../utils";
import { JWTClaims } from "../libs/authManager/secureEnclave/jwt";

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
  const session = await getSession();
  let publicKeyPEM: string;
  try {
    const b64PubKeyPEM = await session.getPublicKey(payload.aud);
    publicKeyPEM = b64PubKeyPEM.includes("BEGIN PUBLIC KEY")
      ? b64PubKeyPEM
      : Buffer.from(b64PubKeyPEM, "base64").toString();
  } catch (error) {
    next(error);
    return;
  }

  try {
    jose.JWT.verify(token, publicKeyPEM);
  } catch (error) {
    util.PRINT_ERROR(error);
    next(new InvalidTokenError(`Error verifying token: ${error.message}`));
    return;
  }

  util.PRINT_DEBUG(`token: Valid token`);
  Object.assign(req.params, { authenticated: true });
  next();
}

export default handleToken;
