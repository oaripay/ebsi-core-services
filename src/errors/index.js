const {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  UnauthorizedError,
  ProblemDetailsError,
} = require("@cef-ebsi/problem-details-errors");
const { errorHandler } = require("@cef-ebsi/express-problem-details");
const logger = require("../logger");

const handler = errorHandler((normalizedError, originalError) => {
  if (originalError) {
    // Axios error
    if (originalError.response)
      logger.error(JSON.stringify(originalError.response.data));

    logger.error(originalError.stack);
  }

  logger.error(
    `Error ${normalizedError.status} ${normalizedError.title}: ${normalizedError.detail}`
  );
});

module.exports = {
  handler,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  InternalServerError,
  ProblemDetailsError,
};
