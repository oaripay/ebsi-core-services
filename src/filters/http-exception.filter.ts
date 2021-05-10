import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  ProblemDetailsError,
  InternalServerError,
  NotFoundError,
  BadRequestError,
} from "@cef-ebsi/problem-details-errors";
import { FastifyReply } from "fastify";
import { AxiosError } from "axios";
import { logAxiosError } from "../shared/utils";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(err: Error, host: ArgumentsHost): FastifyReply {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    let problemError: ProblemDetailsError;

    if (err instanceof NotFoundException) {
      problemError = new NotFoundError(NotFoundError.defaultTitle, {
        detail: err.message,
      });
    } else if (err instanceof BadRequestException) {
      let detail = err.message;
      const resp = err.getResponse();
      if (typeof resp === "object") {
        const { message } = resp as { message: string };
        if (message) {
          if (typeof message === "string") detail = message;
          else detail = JSON.stringify(message);
        }
      }
      problemError = new BadRequestError(BadRequestError.defaultTitle, {
        detail,
      });
    } else if (err instanceof ProblemDetailsError) {
      problemError = err;
    } else {
      if ((err as AxiosError).isAxiosError) {
        logAxiosError(err as AxiosError, this.logger);
      } else {
        this.logger.error(err.message, err.stack);
      }

      problemError = new InternalServerError(undefined, {
        detail:
          "The server encountered an internal error and was unable to complete your request",
      });
    }

    this.logger.debug(
      `${problemError.toString()}: ${problemError.detail || "No detail"}`
    );

    return response
      .code(problemError.status)
      .type("application/problem+json")
      .send(problemError.toJSON());
  }
}

export default AllExceptionsFilter;
