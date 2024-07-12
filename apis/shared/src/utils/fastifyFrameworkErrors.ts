import { FastifyRequest, FastifyReply, FastifyError } from "fastify";
import type { LoggerService } from "@nestjs/common";

export const frameworkErrors =
  (logger: LoggerService) =>
  (error: unknown, req: FastifyRequest, res: FastifyReply) => {
    if (error instanceof Error) {
      logger.error(error.message, error.stack);
    } else {
      logger.error(error);
    }

    if (error && (error as FastifyError).code === "FST_ERR_BAD_URL") {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      res.code(400);
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      res.send({
        title: "Bad Request",
        detail: `${req.url} is not a valid url component`,
        status: 400,
        type: "about:blank",
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      res.code(500);
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      res.send({
        title: "Internal Server Error",
        detail:
          "The server encountered an internal error and was unable to complete your request",
        status: 500,
        type: "about:blank",
      });
    }
  };

export default frameworkErrors;
