import HTTPError from "./HTTPError";

class TooLargeError extends HTTPError {
  constructor(detail: string) {
    super("Payload Too large", 413, detail);
  }
}

export default TooLargeError;
