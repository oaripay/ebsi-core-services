import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ProblemDetailsError,
  InternalServerError,
  NotFoundError,
  BadRequestError,
} from "@cef-ebsi/problem-details-errors";
import type { FastifyReply } from "fastify";
import axios from "axios";
import { ApiConfig } from "../config/configuration";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  private tag: string;

  constructor(configService: ConfigService<ApiConfig, true>) {
    if (process.env.EBSI_ENV === "test") {
      this.tag = configService.get<string>("dockerContainerTag");
    }
  }

  catch(err: Error, host: ArgumentsHost): FastifyReply {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    if (this.tag) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      response.header("EBSI-Image-Tag", this.tag);
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
      if (axios.isAxiosError(err)) {
        // Properly log error, https://github.com/axios/axios#handling-errors
        this.logger.error("Axios error intercepted.", err.stack);
        if (err.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          this.logger.error({
            data: err.response.data,
            status: err.response.status,
            headers: err.response.headers,
          });
        } else if (err.request) {
          // The request was made but no response was received
          // `err.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          this.logger.error({
            request: err.request as unknown,
          });
        } else {
          // Something happened in setting up the request that triggered an Error
          this.logger.error({
            message: err.message,
          });
        }

        this.logger.error(err.toJSON());
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
