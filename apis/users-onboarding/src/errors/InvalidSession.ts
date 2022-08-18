import { BadRequestError } from "@cef-ebsi/problem-details-errors";

export class InvalidSession extends BadRequestError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSession";
  }
}

export default InvalidSession;
