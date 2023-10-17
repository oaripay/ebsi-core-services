import { BadRequestError } from "./BadRequestError.js";

export class ExcessiveAppUsageError extends BadRequestError {
  constructor(detail?: string) {
    super("Excessive app usage", detail ? { detail } : {});
  }
}

export default ExcessiveAppUsageError;
