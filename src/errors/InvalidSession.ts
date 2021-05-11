class InvalidSession extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSession";
  }
}

export default InvalidSession;
