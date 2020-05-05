import HTTPError from "./HTTPError";

class NotFoundError extends HTTPError {
  constructor(detail: string) {
    super("Not Found", 404, detail);
  }
}

export default NotFoundError;
