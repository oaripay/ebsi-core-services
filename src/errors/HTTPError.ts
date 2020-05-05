class HTTPError extends Error {
  constructor(
    protected title: string,
    protected status: number,
    protected detail: string
  ) {
    super(title);
    this.name = "HTTPError";
    this.title = title;
    this.status = status;
    this.detail = detail;
  }

  get Name() {
    return this.name;
  }

  get Title() {
    return this.title;
  }

  get Status() {
    return this.status;
  }

  get Detail() {
    return this.detail;
  }

  print() {
    return {
      title: this.title,
      status: this.status,
      detail: this.detail,
    };
  }
}

export default HTTPError;
