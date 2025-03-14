import { IsEthereumAddress } from "class-validator";

import { ArgsUpdateIssuerProxy } from "../sendSignedTransaction/index.ts";

export class UpdateIssuerProxyParam extends ArgsUpdateIssuerProxy {
  @IsEthereumAddress()
  from!: string;
}
