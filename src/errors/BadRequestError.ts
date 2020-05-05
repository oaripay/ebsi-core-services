import HTTPError from "./HTTPError";

class BadRequestError extends HTTPError {
  constructor(detail: string) {
    super("Bad Request", 400, detail);
  }
}

export default BadRequestError;
