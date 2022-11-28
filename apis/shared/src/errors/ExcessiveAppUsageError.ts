import { BadRequestError } from "@cef-ebsi/problem-details-errors";

export class ExcessiveAppUsageError extends BadRequestError {
  constructor(detail?: string) {
    super("Excessive app usage", { detail });
  }
}

export default ExcessiveAppUsageError;
