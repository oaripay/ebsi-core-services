import InternalError from "./InternalError";
import HTTPError from "./HTTPError";
import BadRequestError from "./BadRequestError";
import ForbiddenError from "./ForbiddenError";
import InvalidAppError from "./InvalidAppError";
import InvalidTokenError from "./InvalidTokenError";
import IssuerNotFoundError from "./IssuerNotFoundError";
import TooLargeError from "./TooLargeError";
import UnauthorizedError from "./UnauthorizedError";
import NotFoundError from "./NotFoundError";

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

  if (error.Status >= 500) {
    LOGGER.error(error.Detail);
    LOGGER.error(error);
  }

  LOGGER.error(`Error ${error.Status}: ${error.Detail}`);
  res.setHeader("Content-Type", "application/json");
  res.status(error.Status);
  res.json(error.print());
  res.render("error", { error });
};

export {
  HTTPError,
  EbsiError,
  handleError,
  NotFoundError,
  TooLargeError,
  InternalError,
  ForbiddenError,
  InvalidAppError,
  EBSI_API_ERRORS,
  WALLET_MESSAGES,
  BadRequestError,
  InvalidTokenError,
  UnauthorizedError,
  API_ERROR_MESSAGES,
  EBSI_API_ERRORS_INT,
  IssuerNotFoundError,
};
