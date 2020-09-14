function getRevertMessage(revertReason) {
  let rawMessageData = revertReason.slice(2);
  const strLen = parseInt(rawMessageData.slice(8 + 64, 8 + 128), 16);
  const reasonCodeHex = rawMessageData.slice(8 + 128, 8 + 128 + strLen * 2);
  reason = web3.utils.hexToAscii("0x" + reasonCodeHex);
  return reason;
}
async function assertRevert(promise, revertReason) {
  try {
    await promise;
    assert.fail("Expected revert not received");
  } catch (error) {
    console.log(
      `revertReason:${revertReason} error.reason:${
        error.reason
      } error:${JSON.stringify(error)}`
    );
    if (revertReason) {
      console.log(`revertReason !!! `);
      if (error.receipt && error.receipt.revertReason) {
        console.log(`reason from besu !!! `);
        // reason from besu
        assert(
          revertReason === getRevertMessage(error.receipt.revertReason),
          `Expected "${revertReason}", got ${getRevertMessage(
            error.receipt.revertReason
          )} instead`
        );
      } else {
        console.log(`reason ganache ganache !!! `);
        // reason from ganache
        assert(
          revertReason === error.reason,
          `Expected "${revertReason}", got ${error.reason} instead`
        );
      }
    }

    const revertFound = error.message.search("revert") >= 0;
    assert(revertFound, `Expected "revert", got ${error} instead`);
  }
}

module.exports = assertRevert;
