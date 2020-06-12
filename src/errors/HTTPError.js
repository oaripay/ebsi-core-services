class HTTPError extends Error {
  constructor(title, status, detail) {
    super(title);
    this.name = "HTTPError";
    this.title = title;
    this.status = status;
    this.detail = detail;
  }

  print() {
    return {
      title: this.title,
      status: this.status,
      detail: this.detail,
    };
  }
}

module.exports = HTTPError;
