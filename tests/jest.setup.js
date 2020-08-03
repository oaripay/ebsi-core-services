expect.extend({
  toBeHTTPError(received, ErrorClass) {
    if (!received.title || !received.status)
      return {
        message: () =>
          `Received error does not contain title and status. Received: ${received}`,
        pass: false,
      };
    const error = new ErrorClass();
    if (received.title !== error.title) {
      return {
        message: () =>
          `Expected title: "${error.title}". Received: "${received.title}"`,
        pass: false,
      };
    }
    if (received.status !== error.status) {
      return {
        message: () =>
          `Expected status: "${error.title}". Received: "${received.title}"`,
        pass: false,
      };
    }
    return {
      message: () =>
        `Not expected: "${error.toString()}". Received: "${received}"`,
      pass: true,
    };
  },
});
