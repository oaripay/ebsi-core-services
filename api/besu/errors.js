class HTTPError extends Error {
  constructor(title, status, detail) {
    super(title);
    this.title = title;
    this.status = status;
    this.detail = detail;
  }
  toString() {
    return JSON.stringify({
      title: this.title,
      status: this.status,
      detail: this.detail,
    });
  }
}

class BadRequestError extends HTTPError {
  constructor(detail) {
    super("Bad Request", 400, detail);
  }
}

class UnauthorizedError extends HTTPError {
  constructor(detail) {
    super("Unathorized", 401, detail);
  }
}

class ForbiddenError extends HTTPError {
  constructor(detail) {
    super("Forbidden", 403, detail);
  }
}

class TooLargeError extends HTTPError {
  constructor(detail) {
    super("Too large", 412, detail);
  }
}

class InternalError extends HTTPError {
  constructor(detail) {
    super("Internal Error", 500, detail);
  }
}


function handler(error, req, res, next) {
  res
    .setHeader("Content-Type", "application/problem+json")
    .status(error.status)
    .send(error.toString());
}

module.exports = {
  handler
};
