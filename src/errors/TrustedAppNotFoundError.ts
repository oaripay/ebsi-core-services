import { BadRequestError } from "@cef-ebsi/problem-details-errors";

class TrustedAppNotFoundError extends BadRequestError {
  constructor(detail: string) {
    super("Trusted App Not Found", { detail });
  }
}

export default TrustedAppNotFoundError;
