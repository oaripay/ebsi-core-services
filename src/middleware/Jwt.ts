import { Request, Response } from "express";
import { JWT } from "jose";
import { AuthManager } from "src/libs/authManager/AuthManager";
import { PRINT_DEBUG, PRINT_ERROR } from "src/utils/util";
import {
  WALLET_API_ERRORS,
  EBSI_API_ERRORS_INT,
  EBSI_API_ERRORS,
  getCode,
} from "src/error";
import { Verifier } from "src/libs/authManager/secureEnclave/Verifier";
import ComponentSecureEnclave from "src/libs/authManager/secureEnclave/ComponentSecureEnclave";
import {
  IUserAuthZToken,
  IEnterpriseAuthZToken,
  IUserAuthNToken,
} from "src/libs/authManager/secureEnclave/JWT";

const logRequest = (req: Request): void => {
  PRINT_DEBUG(`Request logged:${req.method}${req.path}`);
};

const getTokenFromHeader = (req: Request): string => {
  let token =
    <string>req.headers["x-access-token"] || req.headers.authorization; // Express headers are auto converted to lowercase
  if (token && token.includes("Bearer ")) {
    // Remove Bearer from string
    token = token.slice(7, token.length);
    return token;
  }
  PRINT_ERROR(WALLET_API_ERRORS.NO_BEARER_TOKEN, "getTokenFromHeader");
  throw new Error(WALLET_API_ERRORS.NO_BEARER_TOKEN);
};

// Create 3 different JWT validations.
// - user-login JWT AuthN (need to check CAS ticket)
// - component-login JWT AuthN (need to get public key from ledger)
// - verify AuthZ JWT
const verifyJwt = async (req: Request, res: Response, next): Promise<any> => {
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
        PRINT_ERROR((<Error>error).message, "Error verifying JWT: verifyVcJwt");
        PRINT_ERROR((<Error>error).name);
        PRINT_ERROR((<Error>error).stack);
        return res
          .status(EBSI_API_ERRORS_INT.NOT_AUTENTICATED_USER_401)
          .json({ message: error.message });
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
        PRINT_ERROR((<Error>error).message, "Error verifying JWT: verifyVcJwt");
        PRINT_ERROR((<Error>error).name);
        PRINT_ERROR((<Error>error).stack);
        return res
          .status(EBSI_API_ERRORS_INT.NOT_AUTENTICATED_USER_401)
          .json({ message: error.message });
      }
    }
    // throw error if JWT provided does not match the required token type
    if (!verified) {
      PRINT_ERROR(EBSI_API_ERRORS.UNAUTHORIZED_ACCESS, "verifyJwt");
      return res
        .status(EBSI_API_ERRORS_INT.UNAUTHORIZED_ACCESS_403)
        .json({ message: EBSI_API_ERRORS.UNAUTHORIZED_ACCESS });
    }
    next();
    return verified;
  } catch (error) {
    PRINT_ERROR((<Error>error).message, "Error verifying JWT: verifyVcJwt");
    PRINT_ERROR((<Error>error).name);
    PRINT_ERROR((<Error>error).stack);
    return res
      .status(getCode((<Error>error).message))
      .json({ message: (<Error>error).message, stack: (<Error>error).stack });
  }
};

const checkAuthorization = (req: Request, res: Response, next): any => {
  try {
    const enclave = ComponentSecureEnclave.Instance;

    if (req.body.issuer !== enclave.enclaveDid) {
      PRINT_ERROR(EBSI_API_ERRORS.UNAUTHORIZED_ACCESS, "checkAuthorization");
      return res
        .status(EBSI_API_ERRORS_INT.UNAUTHORIZED_ACCESS_403)
        .json({ message: EBSI_API_ERRORS.UNAUTHORIZED_ACCESS });
    }

    next();
    return true;
  } catch (error) {
    PRINT_ERROR(
      (<Error>error).message,
      "Error verifying JWT: checkAuthorization"
    );
    PRINT_ERROR((<Error>error).name);
    PRINT_ERROR((<Error>error).stack);
    return res
      .status(getCode((<Error>error).message))
      .json({ message: (<Error>error).message, stack: (<Error>error).stack });
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
const parseEntityJWT = (req: Request, res: Response, next): any => {
  try {
    const token = getTokenFromHeader(req);

    let entityAuthToken: any;

    // check if token is a user Token or enterprise Token
    // eslint-disable-next-line prefer-const
    entityAuthToken = JWT.decode(token);

    if (entityAuthToken.userId) {
      const entityAuthZToken = <IUserAuthZToken>JWT.decode(token);
      if (!entityAuthZToken.did) {
        PRINT_ERROR(EBSI_API_ERRORS.NOT_AUTENTICATED_USER, "parseEntityJWT");
        return res
          .status(EBSI_API_ERRORS_INT.NOT_AUTENTICATED_USER_401)
          .json({ message: EBSI_API_ERRORS.NOT_AUTENTICATED_USER });
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
      const entityAuthZToken = <IEnterpriseAuthZToken>JWT.decode(token);

      if (!entityAuthZToken.did) {
        PRINT_ERROR(EBSI_API_ERRORS.NOT_AUTENTICATED_USER, "parseEntityJWT");
        return res
          .status(EBSI_API_ERRORS_INT.NOT_AUTENTICATED_USER_401)
          .json({ message: EBSI_API_ERRORS.NOT_AUTENTICATED_USER });
      }

      Object.assign(req.params, { jwt: JSON.stringify(entityAuthZToken) });
      Object.assign(req.params, { didJwt: entityAuthZToken.did });
    }

    if (entityAuthToken.ticket) {
      const entityAuthNtoken = <IUserAuthNToken>JWT.decode(token);

      Object.assign(req.params, { jwt: JSON.stringify(entityAuthNtoken) });
      Object.assign(req.params, { didJwt: entityAuthNtoken.iss });
    }

    // Save token also in params
    Object.assign(req.params, { token });

    next();
    return true;
  } catch (error) {
    PRINT_ERROR((<Error>error).message, "Error parsing JWT: parseEntityJWT");
    PRINT_ERROR((<Error>error).name);
    PRINT_ERROR((<Error>error).stack);
    return res
      .status(getCode((<Error>error).message))
      .json({ message: (<Error>error).message, stack: (<Error>error).stack });
  }
};

const saveToken = (req: Request, res: Response, next): any => {
  try {
    const token = getTokenFromHeader(req);
    // Assign token to AuthManager to be accessible to call other EBSI components
    AuthManager.Instance.saveReceivedAuthZUserToken(token);
    next();
    return true;
  } catch (error) {
    PRINT_ERROR(EBSI_API_ERRORS.NOT_AUTENTICATED_USER, "saveToken");
    return res
      .status(getCode((<Error>error).message))
      .json({ message: (<Error>error).message, stack: (<Error>error).stack });
  }
};

const verifyJWTParamDIDs = (req: Request, res: Response, next): any => {
  if (!req || !req.params.did || !req.params.didJwt) {
    PRINT_ERROR(WALLET_API_ERRORS.DID_NOT_DEFINED, "verifyJWTParamDIDs");
    return res
      .status(getCode(WALLET_API_ERRORS.DID_NOT_DEFINED))
      .json({ message: WALLET_API_ERRORS.DID_NOT_DEFINED });
  }
  if (req.params.didJwt !== req.params.did) {
    PRINT_ERROR(WALLET_API_ERRORS.DID_MISMATCH, "verifyJWTParamDIDs");
    return res
      .status(getCode(WALLET_API_ERRORS.DID_MISMATCH))
      .json({ message: WALLET_API_ERRORS.DID_MISMATCH });
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
