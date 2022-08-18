import axios, { AxiosResponse } from "axios";
import { Agent as OAuth2Agent, AkeResponse } from "@cef-ebsi/oauth2-auth";
import { randomUUID } from "crypto";
import { ConfigService } from "@nestjs/config";
import { TransactionReceipt } from "@ethersproject/abstract-provider";
import { ApiConfig } from "../../src/config/configuration";

export interface TransactionReceiptBesu extends TransactionReceipt {
  revertReason: string;
}

export async function getAccessToken(
  configService: ConfigService<ApiConfig, true>
) {
  const authorisationApiUrl = configService.get<string>("authorisationApiUrl");

  const nonce = randomUUID();

  const agent = new OAuth2Agent({
    privateKey: configService.get<string>("apiPrivateKey"),
    name: configService.get<string>("apiName"),
    trustedAppsRegistry: `${configService.get<string>("tarApiUrl")}/apps`,
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

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return receipt;
};

export default waitToBeMined;
