function encodeCall(name, arguments, values) {
  return web3.eth.abi.encodeFunctionCall(
    {
      name: name,
      type: "function",
      inputs: arguments,
    },
    values
  );
}
module.exports = encodeCall;
