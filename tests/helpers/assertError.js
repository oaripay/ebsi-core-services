async function assertError(promise) {
  try {
    await promise;
    assert.fail("Expected error not received");
  } catch (error) {
    const errorMessageFound = error.message.length > 0;
    assert(errorMessageFound, `no error message found`);
  }
}

module.exports = assertError;
