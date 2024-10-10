import {
  ExceptionFilter,
  Catch,
  type ArgumentsHost,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  ProblemDetailsError,
  InternalServerError,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  logAxiosError,
} from "@ebsiint-api/shared";
import type { FastifyReply } from "fastify";
import axios from "axios";
import { stringify } from "safe-stable-stringify";

function getProblemDetailsError(
  error: unknown,
  logger: Logger,
): ProblemDetailsError {
  if (error instanceof ProblemDetailsError) {
    return error;
  }

  if (error instanceof NotFoundException) {
    // Log NestJS NotFoundException
    logger.error(error.message, error.stack);

    // Map to Problem Details error
    return new NotFoundError(NotFoundError.defaultTitle, {
      detail: error.message,
    });
  }

  if (error instanceof ForbiddenException) {
    // Log NestJS ForbiddenError
    logger.error(error.message, error.stack);

    // Map to Problem Details error
    return new ForbiddenError(ForbiddenError.defaultTitle, {
      detail: error.message,
    });
  }

  if (error instanceof BadRequestException) {
    // Log NestJS BadRequestException
    logger.error(error.message, error.stack);

    let detail = error.message;
    const resp = error.getResponse();
    if (typeof resp === "object" && "message" in resp && resp.message) {
      if (typeof resp.message === "string") detail = resp.message;
      else detail = stringify(resp.message);
    }

    // Map to Problem Details error
    return new BadRequestError(BadRequestError.defaultTitle, {
      detail,
    });
  }

  // Log unhandled error
  if (axios.isAxiosError(error)) {
    logAxiosError(error, logger);
  } else if (error instanceof Error) {
    logger.error(error.message, error.stack);
  } else {
    logger.error(error);
  }

  return new InternalServerError(undefined, {
    detail:
      "The server encountered an internal error and was unable to complete your request",
  });
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(err: Error, host: ArgumentsHost): FastifyReply {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    // Return ServiceUnavailableException (thrown by HealthCheck module) as it is
    if (err instanceof ServiceUnavailableException) {
      return response
        .code(err.getStatus())
        .type("application/json")
        .send(err.getResponse());
    }

    // Generic error
    const problemError = getProblemDetailsError(err, this.logger);

    return response
      .code(problemError.status)
      .type("application/problem+json")
      .send(problemError.toJSON());
  }
}

export default AllExceptionsFilter;
