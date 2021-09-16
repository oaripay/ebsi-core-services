import { BadRequestError } from "@cef-ebsi/problem-details-errors";

class InvalidSession extends BadRequestError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSession";
  }
}

export default InvalidSession;
