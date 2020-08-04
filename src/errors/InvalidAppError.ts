import { BadRequestError } from "@cef-ebsi/problem-details-errors";

class InvalidAppError extends BadRequestError {
  constructor(detail: string) {
    super("Invalid App", { detail });
  }
}

export default InvalidAppError;
