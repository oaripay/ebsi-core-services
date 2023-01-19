import { PayloadTooLargeError } from "./PayloadTooLargeError";

export class ValueTooLargeError extends PayloadTooLargeError {
  constructor(detail: string) {
    super(PayloadTooLargeError.defaultTitle, { detail });
  }
}

export default ValueTooLargeError;
