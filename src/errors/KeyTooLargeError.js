const HTTPError = require("./HTTPError");

class KeyTooLargeError extends HTTPError {
  constructor(detail) {
    super("Key Too large", 414, detail);
  }
}

module.exports = KeyTooLargeError;
