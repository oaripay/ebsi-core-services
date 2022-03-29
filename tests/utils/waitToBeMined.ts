import { randomUUID } from "node:crypto";
import axios, { AxiosResponse } from "axios";
import { Agent, AkeResponse } from "@cef-ebsi/oauth2-auth";
import { ConfigService } from "@nestjs/config";
import { TransactionReceipt } from "@ethersproject/abstract-provider";
import { ApiConfig } from "../../src/config/configuration";

export interface TransactionReceiptBesu extends TransactionReceipt {
  revertReason: string;
}

export async function getAccessToken(configService: ConfigService<ApiConfig>) {
  const authorisationApiUrl = configService.get<string>("authorisationApiUrl");
  const trustedAppsRegistry = `${configService.get<string>(
    "trustedAppsRegistryApiUrl"
  )}/apps`;
  const privateKey = configService.get<string>("apiPrivateKey");

  const nonce = randomUUID();
  const agent = new Agent({
    privateKey,
    name: configService.get<string>("apiName"),
    trustedAppsRegistry,
  });

  const requestComponent = await agent.createRequest(
    configService.get<string>("ledgerApiName"),
    { nonce }
  );

  const res = await axios.post<
    typeof requestComponent,
    AxiosResponse<AkeResponse>
  >(`${authorisationApiUrl}/oauth2-sessions`, requestComponent);

  const accessToken = await agent.verifyAkeResponse(res.data, { nonce });

  return accessToken;
}

export async function getTransactionReceipt(
  url: string,
  accessToken: string,
  txId: string
): Promise<TransactionReceiptBesu> {
  const { data } = await axios.post<{
    result: TransactionReceiptBesu;
  }>(
    url,
    {
      jsonrpc: "2.0",
      method: "eth_getTransactionReceipt",
      params: [txId],
    },
    {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (data.result) data.result.status = Number(data.result.status);
  return data.result;
}

export const waitToBeMined = async (
  url: string,
  accessToken: string,
  txId: string
): Promise<TransactionReceiptBesu> => {
  let mined = false;
  let receipt: TransactionReceiptBesu;
  /* eslint-disable no-await-in-loop */
  while (!mined) {
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
    receipt = await getTransactionReceipt(url, accessToken, txId);
    mined = !!receipt;
  }

  return receipt;
};

export default waitToBeMined;
