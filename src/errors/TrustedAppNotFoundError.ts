import HTTPError from "./HTTPError";

class TrustedAppNotFoundError extends HTTPError {
  constructor(detail: string) {
    super("Trusted App Not Found", 400, detail);
  }
}

export default TrustedAppNotFoundError;
