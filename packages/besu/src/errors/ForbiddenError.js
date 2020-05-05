const HTTPError = require("./HTTPError");

class ForbiddenError extends HTTPError {
  constructor(detail) {
    super("Forbidden", 403, detail);
  }
}

module.exports = ForbiddenError;
