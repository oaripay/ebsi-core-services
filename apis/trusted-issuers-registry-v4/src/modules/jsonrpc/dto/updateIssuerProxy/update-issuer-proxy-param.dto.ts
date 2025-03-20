import { IsEthereumAddress } from "@ebsiint-api/shared";

import { ArgsUpdateIssuerProxy } from "../sendSignedTransaction/index.ts";

export class UpdateIssuerProxyParam extends ArgsUpdateIssuerProxy {
  @IsEthereumAddress()
  from!: string;
}
