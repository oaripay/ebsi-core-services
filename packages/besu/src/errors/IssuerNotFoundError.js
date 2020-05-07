const HTTPError = require("./HTTPError");

class IssuerNotFoundError extends HTTPError {
  constructor(detail) {
    super("Issuer Not Found", 400, detail);
  }
}

module.exports = IssuerNotFoundError;
