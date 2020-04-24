const HTTPError = require("./HTTPError");

class TooLargeError extends HTTPError {
  constructor(detail) {
    super("Payload Too large", 413, detail);
  }
}

module.exports = TooLargeError;
