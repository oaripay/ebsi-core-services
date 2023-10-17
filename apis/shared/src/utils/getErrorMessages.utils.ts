import * as ClassValidator from "class-validator";
import { ProblemDetailsError } from "../errors/ProblemDetailsError.js";
import { isEthersError } from "./isEthersError.js";

export function getErrorMessages(
  errors: ClassValidator.ValidationError[],
): string[] {
  return errors
    .map((err) => {
      const errorMessages: string[] = [];
      if (err.constraints) {
        errorMessages.push(...Object.values(err.constraints));
      }

      if (err.children) {
        errorMessages.push(...getErrorMessages(err.children));
      }

      return errorMessages;
    })
    .flat();
}

export function getErrorMessage(error: unknown) {
  if (isEthersError(error)) {
    return error.reason;
  }
  if (error instanceof ProblemDetailsError && error.detail) {
    return error.detail;
  }
  return (error as Error).message;
}

export default getErrorMessages;
