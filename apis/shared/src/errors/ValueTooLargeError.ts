import { PayloadTooLargeError } from "./PayloadTooLargeError.js";

export class ValueTooLargeError extends PayloadTooLargeError {
  constructor(detail: string) {
    super(PayloadTooLargeError.defaultTitle, { detail });
  }
}

export default ValueTooLargeError;
