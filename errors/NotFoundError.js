const HTTPError = require("./HTTPError");

class NotFoundError extends HTTPError {
  constructor(detail) {
    super("Not Found", 404, detail);
  }
}

module.exports = NotFoundError;
