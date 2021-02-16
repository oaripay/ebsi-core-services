import { UriTooLongError } from "@cef-ebsi/problem-details-errors";

export class KeyTooLargeError extends UriTooLongError {
  constructor(detail?: string) {
    super("Key Too large", { detail });
  }
}

export default KeyTooLargeError;
