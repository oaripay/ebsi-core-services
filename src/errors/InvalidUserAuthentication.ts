class InvalidUserAuthentication extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUserAuthentication";
  }
}

export default InvalidUserAuthentication;
