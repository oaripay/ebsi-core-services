import express from "express";
import EBSI_JWT from "@cef-ebsi/app-jwt";
import * as config from "../config";
import { util } from "../utils";

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
  try {
    const tar = new EBSI_JWT.TrustedAppRegistry(
      config.EBSI_SERVICE.URL.TRUSTED_APPS_REGISTRY
    );
    await tar.verify(token);
    Object.assign(req.params, { authenticated: true });
    next();
  } catch (error) {
    Object.assign(req.params, { authenticated: false });
    next(error);
  }
}

async function callNewSession(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const { body } = req;
    const session = new EBSI_JWT.Session(
      config.API_NAME,
      config.API_PRIVATE_KEY,
      config.EBSI_SERVICE.URL.TRUSTED_APPS_REGISTRY
    );
    const result = await session.newSession(body);
    res.send(result);
  } catch (error) {
    next(error);
  }
}

export { handleToken, callNewSession };
