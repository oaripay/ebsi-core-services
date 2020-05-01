import * as express from "express";
import cors from "cors";
import { parseEntityJWT } from "../../middleware/jwt";
import { EBSI_SERVICE } from "../../config";
import { handleError, BadRequestError, API_ERROR_MESSAGES } from "../../errors";
import * as auth from "../../middleware/auth";
import Controller from "./controller";
import applyPaginationFormat from "../../middleware/formatResponse";
import { isHash } from "../../utils/util";

class Router {
  constructor(server: express.Express, swaggerDoc: any) {
    const router = express.Router();
    router.get("/swagger.json", (req: express.Request, res: express.Response) =>
      res.send(swaggerDoc)
    );

    // sessions call managed by auth middleware
    router.post(EBSI_SERVICE.CALL.EBSI_LOGIN, auth.callNewSession);

    router.put(
      `${EBSI_SERVICE.CALL.SET_ATTRIBUTE}/:hash`,
      cors(),
      auth.handleToken,
      parseEntityJWT,
      async (req: express.Request, res: express.Response, next) => {
        try {
          const { didJwt, hash } = req.params;
          if (!didJwt || !hash)
            throw new BadRequestError(
              API_ERROR_MESSAGES.ATTRIBUTES_DID_HASH_NOT_FOUND
            );
          if (!isHash(hash))
            throw new BadRequestError(
              `The hash:${hash} parameter is not valid`
            );

          const result = await Controller.setAttribute(didJwt, hash, req.body);
          res.status(result.newAttribute ? 201 : 200).json(result.attribute);
        } catch (error) {
          next(error);
        }
      }
    );

    /**
     * Retrieves all Credentials  stored in user's ID Hub
     */
    router.get(
      `${EBSI_SERVICE.CALL.GET_ATTRIBUTES}`,
      cors(),
      auth.handleToken,
      async (req: express.Request, res: express.Response, next) => {
        const { did, type } = req.query;
        try {
          if (!did || typeof did !== "string")
            throw new BadRequestError(
              API_ERROR_MESSAGES.ATTRIBUTES_DID_NOT_FOUND
            );
          // when type query param is set, we call the filtered function
          if (type) {
            if (typeof type !== "string")
              throw new BadRequestError(
                API_ERROR_MESSAGES.ATTRIBUTES_TYPE_NOT_FOUND
              );
            const result = await Controller.getAttributesFiltered(did, type);
            res.status(200);
            // adding path, did and encoded type to format link results
            const encodedType = encodeURIComponent(type);
            req.baseUrl += `${req.path}?did=${did}&type=${encodedType}`;
            applyPaginationFormat(result, req, res, next);
          }
          const result = await Controller.getAttributes(did);
          res.status(200);
          // adding path & did to format link results
          req.baseUrl += `${req.path}?did=${did}`;
          applyPaginationFormat(result, req, res, next);
        } catch (error) {
          next(error);
        }
      }
    );

    router.get(
      `${EBSI_SERVICE.CALL.GET_ATTRIBUTE}/:hash`,
      cors(),
      auth.handleToken,
      parseEntityJWT,
      async (req: express.Request, res: express.Response, next) => {
        const { didJwt, hash } = req.params;
        try {
          if (!hash || !didJwt)
            throw new BadRequestError(
              API_ERROR_MESSAGES.ATTRIBUTES_DID_HASH_NOT_FOUND
            );
          if (!isHash(hash))
            throw new BadRequestError(
              `The hash:${hash} parameter is not valid`
            );

          const result = await Controller.getAttribute(didJwt, hash);
          res.status(200).json(result);
        } catch (error) {
          next(error);
        }
      }
    );

    router.options("*", cors());
    router.use(handleError);
    server.use(EBSI_SERVICE.BASE_PATH.IDHUB, router);
  }
}

export default Router;
