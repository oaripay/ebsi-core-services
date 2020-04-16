import * as express from "express";
import cors from "cors";
import { getCode, getMessage } from "src/error";
import { parseEntityJWT } from "src/middleware/Jwt";
import Controller from "./controller";

class Router {
  constructor(server: express.Express) {
    const router = express.Router();

    router.get(
      "/sessions",
      cors(),
      parseEntityJWT,
      async (req: express.Request, res: express.Response, next) => {
        try {
          const result = await Controller.login();
          res.status(200).json(result);
        } catch (error) {
          res.status(getCode((<Error>error).message)).send(getMessage(error));
          next(error);
        }
      }
    );

    router.options("*", cors());
    server.use("/verifiable-presentation/v1", router);
  }
}

export default Router;
