import { BadRequestError } from "@cef-ebsi/problem-details-errors";

class InvalidUserAuthentication extends BadRequestError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUserAuthentication";
  }
}

export default InvalidUserAuthentication;
