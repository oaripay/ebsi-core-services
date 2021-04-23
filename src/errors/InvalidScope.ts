class InvalidScope extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidScope";
  }
}

export default InvalidScope;
