import { BadRequestError } from "@ebsiint-api/shared";

export class InvalidUserAuthentication extends BadRequestError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUserAuthentication";
  }
}

export default InvalidUserAuthentication;
