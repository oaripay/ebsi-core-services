const HTTPError = require("./HTTPError");

class InvalidTokenError extends HTTPError {
  constructor(detail) {
    super("Invalid Token", 400, detail);
  }
}

module.exports = InvalidTokenError;
