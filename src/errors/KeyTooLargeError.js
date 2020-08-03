const { UriTooLongError } = require("@cef-ebsi/problem-details-errors");

class KeyTooLargeError extends UriTooLongError {
  constructor(detail) {
    super("Key Too large", { detail });
  }
}

module.exports = KeyTooLargeError;
