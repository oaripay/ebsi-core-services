const logger = require("../logger");

const HTTPError = require("./HTTPError");
const BadRequestError = require("./BadRequestError");
const ForbiddenError = require("./ForbiddenError");
const InternalError = require("./InternalError");
const InvalidTokenError = require("./InvalidTokenError");
const UnauthorizedError = require("./UnauthorizedError");

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
  UnauthorizedError,
  ForbiddenError,
  InternalError,
  InvalidTokenError,
};
