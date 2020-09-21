const {web3} = require("@openzeppelin/test-environment");

function encodeCall(name, inputs, values) {
  return web3.eth.abi.encodeFunctionCall(
    {
      name,
      type: "function",
      inputs,
    },
    values
  );
}
module.exports = encodeCall;
