import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  ProblemDetailsError,
  InternalServerError,
  NotFoundError,
} from "@cef-ebsi/problem-details-errors";
import { FastifyReply } from "fastify";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(err: Error | ProblemDetailsError, host: ArgumentsHost): FastifyReply {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    let problemError: ProblemDetailsError;
    if (err instanceof ProblemDetailsError) {
      problemError = err;
    } else if (err instanceof NotFoundException) {
      problemError = new NotFoundError("Invalid service", {
        detail: err.message,
      });
    } else {
      problemError = new InternalServerError(undefined, {
        detail:
          "The server encountered an internal error and was unable to complete your request",
      });
      this.logger.error(err.message, err.stack);
    }

    this.logger.debug(problemError.toString());

    return response
      .code(problemError.status)
      .type("application/problem+json")
      .send(problemError.toJSON());
  }
}

export default AllExceptionsFilter;
