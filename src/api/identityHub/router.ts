import * as express from "express";
import cors from "cors";
import {
  verifyJwt,
  parseEntityJWT,
  verifyJWTParamDIDs,
} from "src/middleware/Jwt";
import { PRINT_DEBUG, PRINT_JSON, PRINT_ERROR } from "src/utils/Util";
import { EBSI_SERVICE } from "src/config";
import { EBSI_API_ERRORS, getCode, getMessage } from "src/error";
import Controller from "./controller";

class Router {
  constructor(server: express.Express, swaggerDoc: any) {
    const router = express.Router();
    router.get("/swagger.json", (req: express.Request, res: express.Response) =>
      res.send(swaggerDoc)
    );

    router.post(
      "/attribute",
      cors(),
      verifyJwt,
      parseEntityJWT,
      async (req: express.Request, res: express.Response, next) => {
        try {
          PRINT_DEBUG(EBSI_SERVICE.URL.IDHUB + EBSI_SERVICE.CALL.SET_ATTRIBUTE);
          if (!req.body || !req.params.didJwt)
            throw Error(EBSI_API_ERRORS.BAD_REQUEST);
          const did: string = req.params.didJwt;
          PRINT_DEBUG(req.params.token);
          PRINT_DEBUG(req.params.didJwt);
          PRINT_JSON(req.body);
          const result = await Controller.setAttribute(did, req.body);
          res.status(200).json(result);
        } catch (error) {
          PRINT_ERROR(
            error,
            EBSI_SERVICE.URL.IDHUB + EBSI_SERVICE.CALL.SET_ATTRIBUTE
          );
          res.status(getCode((<Error>error).message)).send(getMessage(error));
          next(error);
        }
      }
    );

    /**
     * Retrieves all Credentials  stored in user's ID Hub
     */
    router.get(
      "/attributes/:did",
      cors(),
      verifyJwt,
      parseEntityJWT,
      verifyJWTParamDIDs,
      async (req: express.Request, res: express.Response, next) => {
        try {
          PRINT_DEBUG(
            EBSI_SERVICE.URL.IDHUB + EBSI_SERVICE.CALL.GET_ATTRIBUTES
          );
          if (!req.body || !req.params.did)
            throw Error(EBSI_API_ERRORS.BAD_REQUEST);
          const { did } = req.params;
          PRINT_DEBUG(req.params.did);
          PRINT_JSON(req.body);
          const result = await Controller.getAttributes(did);
          res.status(200).json(result);
        } catch (error) {
          PRINT_ERROR(
            error,
            EBSI_SERVICE.URL.IDHUB + EBSI_SERVICE.CALL.GET_ATTRIBUTES
          );
          res.status(getCode((<Error>error).message)).send(getMessage(error));
          next(error);
        }
      }
    );

    router.post(
      "/attributes/:did",
      cors(),
      verifyJwt,
      parseEntityJWT,
      verifyJWTParamDIDs,
      async (req: express.Request, res: express.Response, next) => {
        try {
          PRINT_DEBUG(
            EBSI_SERVICE.URL.IDHUB + EBSI_SERVICE.CALL.GET_ATTRIBUTES
          );
          if (!req.body || !req.params.did)
            throw Error(EBSI_API_ERRORS.BAD_REQUEST);
          const { did } = req.params;
          PRINT_DEBUG(req.params.did);
          PRINT_JSON(req.body);
          const result = await Controller.getAttributesFiltered(did, req.body);
          res.status(200).json(result);
        } catch (error) {
          PRINT_ERROR(
            error,
            EBSI_SERVICE.URL.IDHUB + EBSI_SERVICE.CALL.GET_ATTRIBUTES
          );
          res.status(getCode((<Error>error).message)).send(getMessage(error));
          next(error);
        }
      }
    );

    router.get(
      "/attribute/:did/:hash",
      cors(),
      verifyJwt,
      parseEntityJWT,
      async (req: express.Request, res: express.Response, next) => {
        try {
          PRINT_DEBUG(EBSI_SERVICE.URL.IDHUB + EBSI_SERVICE.CALL.GET_ATTRIBUTE);
          if (!req.body || !req.params.did || !req.params.hash)
            throw Error(EBSI_API_ERRORS.BAD_REQUEST);
          const { did } = req.params;
          const { hash } = req.params;
          PRINT_DEBUG(req.params.did);
          PRINT_DEBUG(req.params.hash);
          const result = await Controller.getAttribute(did, hash);
          res.status(200).json(result);
        } catch (error) {
          PRINT_ERROR(
            error,
            EBSI_SERVICE.URL.IDHUB + EBSI_SERVICE.CALL.GET_ATTRIBUTE
          );
          res.status(getCode((<Error>error).message)).send(getMessage(error));
          next(error);
        }
      }
    );

    router.options("*", cors());
    server.use("/wallet/idhub", router);
  }
}

export default Router;
