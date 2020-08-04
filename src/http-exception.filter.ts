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

@Catch()
export default class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(err: Error | ProblemDetailsError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let problemError;
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
      this.logger.error(err);
    }

    this.logger.debug(problemError.toString());

    response
      .status(problemError.status)
      .set("Content-Type", "application/problem+json")
      .json(problemError.toJSON());
  }
}
