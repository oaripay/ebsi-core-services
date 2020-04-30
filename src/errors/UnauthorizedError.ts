import HTTPError from "./HTTPError";

class UnauthorizedError extends HTTPError {
  constructor(detail: string) {
    super("Unauthorized", 401, detail);
  }
}

export default UnauthorizedError;
