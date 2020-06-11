import { Request, Response } from "express";
import { JWT } from "jose";
import { PRINT_ERROR } from "../utils/util";
import {
  UnauthorizedError,
  InternalError,
  API_ERROR_MESSAGES,
} from "../errors";
import {
  IUserAuthZToken,
  IEnterpriseAuthZToken,
} from "../libs/authManager/secureEnclave/jwt";

const getTokenFromHeader = (req: Request): string => {
  let token =
    <string>req.headers["x-access-token"] || req.headers.authorization; // Express headers are auto converted to lowercase
  if (token && token.includes("Bearer ")) {
    // Remove Bearer from string
    token = token.slice(7, token.length);
    return token;
  }
  PRINT_ERROR(API_ERROR_MESSAGES.NO_BEARER_TOKEN, "getTokenFromHeader");
  throw new InternalError(API_ERROR_MESSAGES.NO_BEARER_TOKEN);
};

/**
 * Parses the JWT and adds the following elements to res.body:
 *   header: JWTHeader
 *   payload: JWTPayload
 *   signature: string
 *   data: string
 * @param req
 * @param res
 * @param next
 */
const parseEntityJWT = (req: Request, res: Response, next): void => {
  try {
    const token = getTokenFromHeader(req);
    // check if token is a user Token or enterprise Token
    const userAuthZToken = <IUserAuthZToken>JWT.decode(token);
    if (userAuthZToken.userName) {
      if (!userAuthZToken.did) {
        next(new UnauthorizedError("Error parsing JWT: DID not found"));
        return;
      }

      Object.assign(req.params, { jwt: JSON.stringify(userAuthZToken) });
      Object.assign(req.params, { didJwt: userAuthZToken.did });
      Object.assign(req.params, { token });
      next();
      return;
    }

    const entityAuthZToken = <IEnterpriseAuthZToken>JWT.decode(token);
    if (
      entityAuthZToken.sub &&
      entityAuthZToken.aud &&
      entityAuthZToken.aud.match(/^ebsi/)
    ) {
      if (!entityAuthZToken.did) {
        next(new UnauthorizedError("Error parsing JWT: DID not found"));
        return;
      }

      Object.assign(req.params, { jwt: JSON.stringify(entityAuthZToken) });
      Object.assign(req.params, { didJwt: entityAuthZToken.did });
      Object.assign(req.params, { token });
      next();
      return;
    }
    // throw error if token is neither of this two types
    throw new UnauthorizedError(
      "token is neither a User or Legal Entity AuthZ Token"
    );
  } catch (error) {
    next(error);
  }
};

export default parseEntityJWT;
