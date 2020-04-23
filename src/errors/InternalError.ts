import HTTPError from "./HTTPError";

class InternalError extends HTTPError {
  constructor(detail: string) {
    super("Internal Server Error", 500, detail);
  }
}

export default InternalError;
