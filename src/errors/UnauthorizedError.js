const HTTPError = require("./HTTPError");

class UnauthorizedError extends HTTPError {
  constructor(detail) {
    super("Unathorized", 401, detail);
  }
}

module.exports = UnauthorizedError;
