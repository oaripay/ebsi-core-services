const logger = require("../logger");

const HTTPError = require("./HTTPError");
const BadRequestError = require("./BadRequestError");
const ForbiddenError = require("./ForbiddenError");
const InternalError = require("./InternalError");
const InvalidAppError = require("./InvalidAppError");
const InvalidTokenError = require("./InvalidTokenError");
const IssuerNotFoundError = require("./IssuerNotFoundError");
const KeyTooLargeError = require("./KeyTooLargeError");
const NotFoundError = require("./NotFoundError");
const TooLargeError = require("./TooLargeError");
const UnauthorizedError = require("./UnauthorizedError");
const ValueTooLargeError = require("./ValueTooLargeError");

function handler(_error, req, res, next) {
  let error;
  if (_error.name === "HTTPError") error = _error;
  else {
    error = new InternalError(_error.message);
    error.stack = _error.stack;
  }

  if (error.status >= 500) {
    logger.error(error.stack);
  }

  logger.info(`Error ${error.status}: ${error.detail}`);
  res.setHeader("Content-Type", "application/problem+json");
  res.status(error.status);
  res.send(error.print());

  next();
}

module.exports = {
  handler,
  HTTPError,
  BadRequestError,
  ForbiddenError,
  InternalError,
  InvalidAppError,
  InvalidTokenError,
  IssuerNotFoundError,
  KeyTooLargeError,
  NotFoundError,
  TooLargeError,
  UnauthorizedError,
  ValueTooLargeError,
};
