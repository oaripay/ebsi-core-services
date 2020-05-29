import InternalError from "./InternalError";
import HTTPError from "./HTTPError";
import BadRequestError from "./BadRequestError";
import InvalidAppError from "./InvalidAppError";
import NotFoundError from "./NotFoundError";
import InvalidTokenError from "./InvalidTokenError";
import UnauthorizedError from "./UnauthorizedError";
import TrustedAppNotFoundError from "./TrustedAppNotFoundError";

import LOGGER from "../logger";
import {
  EbsiError,
  WALLET_MESSAGES,
  API_ERROR_MESSAGES,
  EBSI_API_ERRORS_INT,
  EBSI_API_ERRORS,
} from "./errorCodes";

const handleError = (err, req, res, next) => {
  if (res.headersSent) next(err);
  let error: HTTPError;
  if (err.Name === "HTTPError") error = err;
  else if (err.message && err.message.includes("400"))
    error = new BadRequestError(err.message);
  else error = new InternalError(err.message);

  if (process.env.EBSI_ENV === "test") LOGGER.silent = true;
  if (error.Status >= 500) {
    LOGGER.error(error.Detail);
    LOGGER.error(error);
  }

  LOGGER.error(`Error ${error.Status}: ${error.Detail}`);
  res.setHeader("Content-Type", "application/json");
  res.status(error.Status);
  res.json(error.print());
  next();
};

export {
  HTTPError,
  EbsiError,
  handleError,
  NotFoundError,
  InternalError,
  InvalidAppError,
  EBSI_API_ERRORS,
  WALLET_MESSAGES,
  BadRequestError,
  InvalidTokenError,
  UnauthorizedError,
  API_ERROR_MESSAGES,
  EBSI_API_ERRORS_INT,
  TrustedAppNotFoundError,
};
