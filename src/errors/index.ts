import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
  ProblemDetailsError,
  UnauthorizedError,
} from "@cef-ebsi/problem-details-errors";
import { errorHandler } from "@cef-ebsi/express-problem-details";
import InvalidAppError from "./InvalidAppError";
import InvalidTokenError from "./InvalidTokenError";
import TrustedAppNotFoundError from "./TrustedAppNotFoundError";
import LOGGER from "../logger";
import { ApiErrorMessages } from "./errorCodes";

const handleError = errorHandler(
  (normalizedError: ProblemDetailsError, originalError?: Error) => {
    if (process.env.EBSI_ENV === "test") LOGGER.silent = true;
    if (originalError) {
      LOGGER.error(originalError);
    }

    LOGGER.error(
      `Error ${normalizedError.status} ${normalizedError.title}: ${normalizedError.detail}`
    );
  }
);

export {
  ProblemDetailsError,
  handleError,
  NotFoundError,
  InternalServerError,
  InvalidAppError,
  BadRequestError,
  InvalidTokenError,
  UnauthorizedError,
  ApiErrorMessages,
  TrustedAppNotFoundError,
};
