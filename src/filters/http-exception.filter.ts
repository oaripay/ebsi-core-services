import {
  ExceptionFilter,
  Catch,
  Logger,
  ArgumentsHost,
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

  // eslint-disable-next-line class-methods-use-this
  catch(err: Error | ProblemDetailsError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let problemError;
    if (err instanceof ProblemDetailsError) {
      problemError = err;
    } else if (err instanceof NotFoundException) {
      problemError = new NotFoundError(NotFoundError.defaultTitle, {
        detail: err.message,
      });
    } else {
      this.logger.error(err.stack);
      problemError = new InternalServerError(InternalServerError.defaultTitle, {
        detail:
          "The server encountered an internal error and was unable to complete your request",
      });
    }

    this.logger.debug(problemError.toString());

    response
      .status(problemError.status)
      .set("Content-Type", "application/problem+json")
      .json(problemError.toJSON());
  }
}
