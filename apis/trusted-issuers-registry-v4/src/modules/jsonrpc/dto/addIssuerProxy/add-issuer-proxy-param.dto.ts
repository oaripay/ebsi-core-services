import { IsEthereumAddress } from "@ebsiint-api/shared";

import { ArgsAddIssuerProxy } from "../sendSignedTransaction/index.ts";

export class AddIssuerProxyParam extends ArgsAddIssuerProxy {
  @IsEthereumAddress()
  from!: string;
}
