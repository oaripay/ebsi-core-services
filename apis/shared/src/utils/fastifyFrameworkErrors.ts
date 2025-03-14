import type { LoggerService } from "@nestjs/common";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export const frameworkErrors =
  (logger: LoggerService) =>
  (error: unknown, req: FastifyRequest, res: FastifyReply) => {
    if (error instanceof Error) {
      logger.error(error.message, error.stack);
    } else {
      logger.error(error);
    }

    if (error && (error as FastifyError).code === "FST_ERR_BAD_URL") {
      res.code(400);

      res.send({
        detail: `${req.url} is not a valid url component`,
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
    } else {
      res.code(500);

      res.send({
        detail:
          "The server encountered an internal error and was unable to complete your request",
        status: 500,
        title: "Internal Server Error",
        type: "about:blank",
      });
    }
  };
