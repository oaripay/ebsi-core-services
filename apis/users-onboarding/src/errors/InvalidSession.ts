import { BadRequestError } from "@ebsiint-api/shared";

export class InvalidSession extends BadRequestError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSession";
  }
}

export default InvalidSession;
