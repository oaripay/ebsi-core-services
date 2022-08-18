import { BadRequestError } from "@cef-ebsi/problem-details-errors";

export class InvalidResponse extends BadRequestError {
  constructor(message: string) {
    super(BadRequestError.defaultTitle);
    this.title = BadRequestError.defaultTitle;
    this.detail = message;
  }
}

export default InvalidResponse;
