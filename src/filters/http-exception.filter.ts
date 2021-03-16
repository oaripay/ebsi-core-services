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
import { InvalidRequestJsonRpcError } from "../modules/jsonrpc/errors";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(err: Error, host: ArgumentsHost): FastifyReply {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    if (err instanceof InvalidRequestJsonRpcError) {
      const JsonRpcError = err;
      this.logger.debug(JsonRpcError.toString());
      return response
        .code(JsonRpcError.status)
        .type("application/problem+json")
        .send(JsonRpcError.toJSON());
    }

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
        // Properly log error, https://github.com/axios/axios#handling-errors
        const error = err as AxiosError<unknown>;
        this.logger.error("Axios error intercepted.", error.stack);
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          this.logger.error({
            data: error.response.data,
            status: error.response.status,
            headers: error.response.headers as unknown,
          });
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          this.logger.error({
            request: error.request as unknown,
          });
        } else {
          // Something happened in setting up the request that triggered an Error
          this.logger.error({
            message: error.message,
          });
        }

        this.logger.error(error.toJSON());
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
