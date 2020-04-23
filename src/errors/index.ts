import InternalError from "./InternalError";
import HTTPError from "./HTTPError";
import BadRequestError from "./BadRequestError";
import ForbiddenError from "./ForbiddenError";
import InvalidAppError from "./InvalidAppError";
import InvalidTokenError from "./InvalidTokenError";
import IssuerNotFoundError from "./IssuerNotFoundError";
import TooLargeError from "./TooLargeError";
import UnauthorizedError from "./UnauthorizedError";
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
  else error = new InternalError(err.message);

  if (error.Status >= 500) {
    LOGGER.error(error.Detail);
    LOGGER.error(error);
  }

  LOGGER.error(`Error ${error.Status}: ${error.Detail}`);
  res.setHeader("Content-Type", "application/json");
  res.status(error.Status);
  res.json(error.print());
  next(err);
};

export {
  EbsiError,
  handleError,
  WALLET_MESSAGES,
  API_ERROR_MESSAGES,
  EBSI_API_ERRORS_INT,
  EBSI_API_ERRORS,
  HTTPError,
  BadRequestError,
  InvalidTokenError,
  InvalidAppError,
  IssuerNotFoundError,
  UnauthorizedError,
  ForbiddenError,
  TooLargeError,
  InternalError,
};
