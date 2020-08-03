const { PayloadTooLargeError } = require("@cef-ebsi/problem-details-errors");

class ValueTooLargeError extends PayloadTooLargeError {
  constructor(detail) {
    super(PayloadTooLargeError.defaultTitle, { detail });
  }
}

module.exports = ValueTooLargeError;
