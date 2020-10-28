import { BadRequestError } from "@cef-ebsi/problem-details-errors";
import { ValidationError as ValidationPipeError } from "@nestjs/common";

/**
 * ValidationError extends the Bad Request (400) error type.
 *
 * It takes an array of ValidationError (aliased ValidationPipeError) as a
 * parameter for its constructor. These errors are raised during the validation
 * of the incoming requests.
 */
export class ValidationError extends BadRequestError {
  constructor(errors: ValidationPipeError[]) {
    super("Validation Error", {
      detail: "Your request parameters didn't validate.",
      extensions: {
        "invalid-params": errors.reduce(
          (invalidParams, error) =>
            Object.assign(invalidParams, {
              [error.property]: Object.values(error.constraints),
            }),
          {}
        ),
      },
    });
    this.name = "ValidationError";
  }
}

export default ValidationError;
