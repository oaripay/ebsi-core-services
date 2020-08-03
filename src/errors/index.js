const {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  PayloadTooLargeError,
  InternalServerError,
} = require("@cef-ebsi/problem-details-errors");
const { errorHandler } = require("@cef-ebsi/express-problem-details");
const KeyTooLargeError = require("./KeyTooLargeError");
const ValueTooLargeError = require("./ValueTooLargeError");
const logger = require("../logger");

const handler = errorHandler((normalizedError, originalError) => {
  if (originalError) {
    // Axios error
    if (originalError.response)
      logger.error(JSON.stringify(originalError.response.data));

    logger.error(originalError.stack);
  }

  logger.info(
    `Error ${normalizedError.status} ${normalizedError.title}: ${normalizedError.detail}`
  );
});

module.exports = {
  handler,
  BadRequestError,
  NotFoundError,
};

module.exports = {
  handler,
  BadRequestError,
  KeyTooLargeError,
  NotFoundError,
  PayloadTooLargeError,
  UnauthorizedError,
  ValueTooLargeError,
  InternalServerError,
};
