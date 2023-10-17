import {
  ExceptionFilter,
  Catch,
  type ArgumentsHost,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ProblemDetailsError,
  InternalServerError,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  logAxiosError,
  InvalidRequestJsonRpcError,
} from "@ebsiint-api/shared";
import type { FastifyReply } from "fastify";
import axios, { type AxiosError } from "axios";
import type { ApiConfig } from "../config/configuration.js";

function getProblemDetailsError(
  error: unknown,
  logger: Logger,
): ProblemDetailsError {
  if (error instanceof ProblemDetailsError) {
    return error;
  }

  if (error instanceof NotFoundException) {
    return new NotFoundError(NotFoundError.defaultTitle, {
      detail: error.message,
    });
  }

  if (error instanceof ForbiddenException) {
    return new ForbiddenError(ForbiddenError.defaultTitle, {
      detail: error.message,
    });
  }

  if (error instanceof BadRequestException) {
    let detail = error.message;
    const resp = error.getResponse();
    if (typeof resp === "object") {
      const { message } = resp as { message: string };
      if (message) {
        if (typeof message === "string") detail = message;
        else detail = JSON.stringify(message);
      }
    }

    return new BadRequestError(BadRequestError.defaultTitle, {
      detail,
    });
  }

  if (axios.isAxiosError(error)) {
    logAxiosError(error, logger);
  } else {
    const err = error as AxiosError;
    logger.error(err.message, err.stack);
  }

  return new InternalServerError(undefined, {
    detail:
      "The server encountered an internal error and was unable to complete your request",
  });
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  private tag: string;

  constructor(configService: ConfigService<ApiConfig, true>) {
    this.tag = configService.get<string>("dockerContainerTag");
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

    const problemError = getProblemDetailsError(err, this.logger);

    this.logger.debug(
      `${problemError.toString()}: ${problemError.detail || "No detail"}`,
    );

    return response
      .code(problemError.status)
      .type("application/problem+json")
      .send(problemError.toJSON());
  }
}

export default AllExceptionsFilter;
