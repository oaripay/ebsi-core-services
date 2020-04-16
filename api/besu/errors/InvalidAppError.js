const HTTPError = require("./HTTPError");

class InvalidAppError extends HTTPError {
  constructor(detail) {
    super("Invalid App", 400, detail);
  }
}

module.exports = InvalidAppError;
