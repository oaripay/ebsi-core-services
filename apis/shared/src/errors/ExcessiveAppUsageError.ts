import { BadRequestError } from "./BadRequestError";

export class ExcessiveAppUsageError extends BadRequestError {
  constructor(detail?: string) {
    super("Excessive app usage", { detail });
  }
}

export default ExcessiveAppUsageError;
