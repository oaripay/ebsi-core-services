import HTTPError from "./HTTPError";

class IssuerNotFoundError extends HTTPError {
  constructor(detail: string) {
    super("Issuer Not Found", 400, detail);
  }
}

export default IssuerNotFoundError;
