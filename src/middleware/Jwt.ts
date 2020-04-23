import { Request, Response } from "express";
import { JWT } from "jose";
import { util } from "../utils";
import {
  UnauthorizedError,
  ForbiddenError,
  InternalError,
  API_ERROR_MESSAGES,
  BadRequestError,
} from "../errors";
import {
  ComponentSecureEnclave,
  AuthManager,
  Verifier,
  jwt,
} from "../libs/authManager";

const logRequest = (req: Request): void => {
  util.PRINT_DEBUG(`Request logged:${req.method}${req.path}`);
};

const getTokenFromHeader = (req: Request): string => {
  let token =
    <string>req.headers["x-access-token"] || req.headers.authorization; // Express headers are auto converted to lowercase
  if (token && token.includes("Bearer ")) {
    // Remove Bearer from string
    token = token.slice(7, token.length);
    return token;
  }
  util.PRINT_ERROR(API_ERROR_MESSAGES.NO_BEARER_TOKEN, "getTokenFromHeader");
  throw new InternalError(API_ERROR_MESSAGES.NO_BEARER_TOKEN);
};

// Create 3 different JWT validations.
// - user-login JWT AuthN (need to check CAS ticket)
// - component-login JWT AuthN (need to get public key from ledger)
// - verify AuthZ JWT
const verifyJwt = async (req: Request, res: Response, next): Promise<void> => {
  try {
    let verified = false;
    const token = getTokenFromHeader(req);
    let entityAuthToken: any;
    // check if token is a user Token or enterprise Token
    // eslint-disable-next-line prefer-const
    entityAuthToken = JWT.decode(token);
    const verifier = Verifier.Instance;

    if (entityAuthToken.ticket) {
      try {
        await verifier.verifyVcJwt(token);
        verified = true;
      } catch (error) {
        next(new UnauthorizedError("Error verifying JWT: verifyVcJwt"));
      }
    }

    let matchesPattern = false;
    // See if .sub is not null and if it matches app ids pattern starting with ebsi-*
    if (typeof entityAuthToken.sub !== "undefined") {
      matchesPattern = entityAuthToken.sub.match(/^ebsi/);
    }
    if (
      entityAuthToken.userId ||
      entityAuthToken.enterpriseName ||
      matchesPattern
    ) {
      try {
        await verifier.verifyJwt(token);
        verified = true;
      } catch (error) {
        next(new UnauthorizedError("Error verifying JWT: verifyVcJwt"));
      }
    }
    // throw error if JWT provided does not match the required token type
    if (!verified) {
      next(
        new ForbiddenError(
          "JWT provided does not match the required token type"
        )
      );
    }
    next();
  } catch (error) {
    next(new UnauthorizedError("Error verifying JWT: verifyVcJwt"));
  }
};

const checkAuthorization = (req: Request, res: Response, next): void => {
  try {
    const enclave = ComponentSecureEnclave.Instance;

    if (req.body.issuer !== enclave.enclaveDid) {
      next(
        new ForbiddenError("DID does not match: Body Issuer !== enclaveDID")
      );
    }

    next();
  } catch (error) {
    next(new UnauthorizedError("Error verifying JWT: verifyVcJwt"));
  }
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

    let entityAuthToken: any;

    // check if token is a user Token or enterprise Token
    // eslint-disable-next-line prefer-const
    entityAuthToken = JWT.decode(token);

    if (entityAuthToken.userId) {
      const entityAuthZToken = <jwt.IUserAuthZToken>JWT.decode(token);
      if (!entityAuthZToken.did) {
        next(new UnauthorizedError("Error parsing JWT: DID not found"));
      }

      Object.assign(req.params, { jwt: JSON.stringify(entityAuthZToken) });
      Object.assign(req.params, { didJwt: entityAuthZToken.did });
    }

    let matchesPattern = false;
    // See if .sub is not null and if it matches app ids pattern starting with ebsi-*
    if (typeof entityAuthToken.sub !== "undefined") {
      matchesPattern = entityAuthToken.sub.match(/^ebsi/);
    }
    if (entityAuthToken.enterpriseName || matchesPattern) {
      const entityAuthZToken = <jwt.IEnterpriseAuthZToken>JWT.decode(token);

      if (!entityAuthZToken.did) {
        next(new UnauthorizedError("Error parsing JWT: DID not found"));
      }

      Object.assign(req.params, { jwt: JSON.stringify(entityAuthZToken) });
      Object.assign(req.params, { didJwt: entityAuthZToken.did });
    }

    if (entityAuthToken.ticket) {
      const entityAuthNtoken = <jwt.UserAuthNToken>JWT.decode(token);

      Object.assign(req.params, { jwt: JSON.stringify(entityAuthNtoken) });
      Object.assign(req.params, { didJwt: entityAuthNtoken.iss });
    }

    // Save token also in params
    Object.assign(req.params, { token });

    next();
  } catch (error) {
    next(new UnauthorizedError("Error parsing JWT"));
  }
};

const saveToken = (req: Request, res: Response, next): void => {
  try {
    const token = getTokenFromHeader(req);
    // Assign token to AuthManager to be accessible to call other EBSI components
    AuthManager.Instance.saveReceivedAuthZUserToken(token);
    next();
  } catch (error) {
    next(new UnauthorizedError("Error saving token"));
  }
};

const verifyJWTParamDIDs = (req: Request, res: Response, next): any => {
  if (!req || !req.params.did || !req.params.didJwt) {
    next(new BadRequestError(API_ERROR_MESSAGES.DID_NOT_DEFINED));
  }
  if (req.params.didJwt !== req.params.did) {
    next(new BadRequestError(API_ERROR_MESSAGES.DID_MISMATCH));
  }
  next();
  return true;
};

export {
  verifyJwt,
  parseEntityJWT,
  checkAuthorization,
  saveToken,
  logRequest,
  verifyJWTParamDIDs,
};
