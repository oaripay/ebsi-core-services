import request from "supertest";
import { loadConfig } from "../../src/config/configuration";
import { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

const { ledgerApiUrl } = loadConfig();

export const waitToBeMined = async (
  txId: string,
  token: string
): Promise<{ status: string; blockNumber: string }> => {
  let mined = false;
  let receipt = null;
  /* eslint-disable no-await-in-loop */
  while (!mined) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const responseReceipt: SupertestJsonRpcResponse = await request(
      ledgerApiUrl
    )
      .post("/blockchains/besu")
      .auth(token, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "eth_getTransactionReceipt",
        params: [txId],
        id: 1,
      });
    receipt = responseReceipt.body.result;
    mined = !!receipt;
  }

  return receipt as { status: string; blockNumber: string };
};

export default waitToBeMined;
