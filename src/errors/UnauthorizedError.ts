import HTTPError from "./HTTPError";

class UnauthorizedError extends HTTPError {
  constructor(detail: string) {
    super("Unathorized", 401, detail);
  }
}

export default UnauthorizedError;
