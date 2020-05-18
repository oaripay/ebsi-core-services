const HTTPError = require("./HTTPError");

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

module.exports = InternalError;
