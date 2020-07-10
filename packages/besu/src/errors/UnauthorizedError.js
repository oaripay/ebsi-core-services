const HTTPError = require("./HTTPError");

class UnauthorizedError extends HTTPError {
  constructor(detail) {
    super("Unauthorized", 401, detail);
  }
}

module.exports = UnauthorizedError;
