import HTTPError from "./HTTPError";

class ForbiddenError extends HTTPError {
  constructor(detail: string) {
    super("Forbidden", 403, detail);
  }
}

export default ForbiddenError;
