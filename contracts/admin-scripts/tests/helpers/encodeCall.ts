import { web3 } from "@openzeppelin/test-environment";

export function encodeCall(name, inputs, values) {
  return web3.eth.abi.encodeFunctionCall(
    {
      name,
      type: "function",
      inputs,
    },
    values
  );
}

export default encodeCall;
