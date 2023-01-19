import { BadRequestError } from "@ebsiint-api/shared";
import { ValidationError as ValidationPipeError } from "@nestjs/common";

/**
 * ValidationError extends the Bad Request (400) error type.
 *
 * It takes an array of ValidationError (aliased ValidationPipeError) as a
 * parameter for its constructor. These errors are raised during the validation
 * of the incoming requests.
 */

type InvalidParams = {
  [x: string]: string[] | InvalidParams[];
};

function getConstraints(errors: ValidationPipeError[]): InvalidParams {
  return errors.reduce((invalidParams, error) => {
    if (error.constraints) {
      Object.assign(invalidParams, {
        [error.property]: Object.values(error.constraints),
      });
    }

    if (error.children && error.children.length > 0) {
      if (!invalidParams[error.property]) {
        Object.assign(invalidParams, {
          [error.property]: [],
        });
      }

      (invalidParams[error.property] as InvalidParams[]).push(
        getConstraints(error.children)
      );
    }

    return invalidParams;
  }, {});
}

export class ValidationError extends BadRequestError {
  constructor(errors: ValidationPipeError[]) {
    super("Validation Error", {
      detail: "Your request parameters didn't validate.",
      extensions: {
        "invalid-params": getConstraints(errors),
      },
    });
    this.name = "ValidationError";
  }
}

export default ValidationError;
