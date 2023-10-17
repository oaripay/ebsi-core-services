import {
  ValidationPipe,
  ValidationError as ValidationPipeError,
} from "@nestjs/common";
import { ValidationError } from "../errors/ValidationError.js";

const exceptionFactory = (errors: ValidationPipeError[]) =>
  new ValidationError(errors);

export class EbsiValidationPipe extends ValidationPipe {
  constructor() {
    super({ transform: true, exceptionFactory });
  }
}

export default EbsiValidationPipe;
