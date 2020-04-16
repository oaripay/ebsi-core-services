const HTTPError = require("./HTTPError");

class BadRequestError extends HTTPError {
  constructor(detail) {
    super("Bad Request", 400, detail);
  }
}

module.exports = BadRequestError;
