import { PayloadTooLargeError } from "@cef-ebsi/problem-details-errors";

export class ValueTooLargeError extends PayloadTooLargeError {
  constructor(detail: string) {
    super(PayloadTooLargeError.defaultTitle, { detail });
  }
}

export default ValueTooLargeError;
