import * as ClassValidator from "class-validator";
import { ZodError } from "zod";
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

export function getErrorMessage(error: unknown, defaultErrorMessage?: string) {
  if (isEthersError(error)) {
    return error.reason;
  }

  if (error instanceof ZodError) {
    return error.issues
      .map((issue) => {
        if (issue.path.length === 0) {
          return issue.message;
        }

        return `Invalid '${issue.path.join(".")}': ${issue.message}`;
      })
      .join("\n");
  }

  if (error instanceof ProblemDetailsError && error.detail) {
    return error.detail;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return defaultErrorMessage ?? "Unknown error";
}
