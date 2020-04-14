/* eslint max-classes-per-file: ["error", 9] */

const logger = require("./logger");

class HTTPError extends Error {
  constructor(title, status, detail) {
    super(title);
    this.name = "HTTPError";
    this.title = title;
    this.status = status;
    this.detail = detail;
  }

  jsonString() {
    return JSON.stringify({
      title: this.title,
      status: this.status,
      detail: this.detail,
    });
  }
}

class BadRequestError extends HTTPError {
  constructor(detail) {
    super("Bad Request", 400, detail);
  }
}

class InvalidTokenError extends HTTPError {
  constructor(detail) {
    super("Invalid Token", 400, detail);
  }
}

class InvalidAppError extends HTTPError {
  constructor(detail) {
    super("Invalid App", 400, detail);
  }
}

class IssuerNotFoundError extends HTTPError {
  constructor(detail) {
    super("Issuer Not Found", 400, detail);
  }
}

class UnauthorizedError extends HTTPError {
  constructor(detail) {
    super("Unathorized", 401, detail);
  }
}

class ForbiddenError extends HTTPError {
  constructor(detail) {
    super("Forbidden", 403, detail);
  }
}

class TooLargeError extends HTTPError {
  constructor(detail) {
    super("Payload Too large", 413, detail);
  }
}

class InternalError extends HTTPError {
  constructor(detailError) {
    super(
      "Internal Server Error",
      500,
      "The server encountered an internal error and was unable to complete your request"
    );

    // Error for the logger but not sent to the user
    this.detailError = detailError;
  }
}

function handler(_error, req, res) {
  let error;
  if (_error.name === "HTTPError") error = _error;
  else error = new InternalError(_error.message);

  if (error.status >= 500) {
    logger.error(error.detailError);
    logger.error(error);
  }

  logger.info(`Response ${error.status}: ${error.detail}`);
  res
    .setHeader("Content-Type", "application/problem+json")
    .status(error.status)
    .send(error.jsonString());
}

module.exports = {
  handler,
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
