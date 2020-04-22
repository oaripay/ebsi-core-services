const HTTPError = require("./HTTPError");

class ValueTooLargeError extends HTTPError {
  constructor(detail) {
    super("Payload Too large", 413, detail);
  }
}

module.exports = ValueTooLargeError;
