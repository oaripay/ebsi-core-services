import HTTPError from "./HTTPError";

class InvalidAppError extends HTTPError {
  constructor(detail: string) {
    super("Invalid App", 400, detail);
  }
}

export default InvalidAppError;
