import HTTPError from "./HTTPError";

class InvalidTokenError extends HTTPError {
  constructor(detail: string) {
    super("Invalid Token", 400, detail);
  }
}

export default InvalidTokenError;
