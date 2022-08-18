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
import { InvalidRequestJsonRpcError } from "../modules/jsonrpc/errors";
import { logAxiosError } from "../shared/utils";
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
      if (axios.isAxiosError(err)) {
        logAxiosError(err, this.logger);
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
