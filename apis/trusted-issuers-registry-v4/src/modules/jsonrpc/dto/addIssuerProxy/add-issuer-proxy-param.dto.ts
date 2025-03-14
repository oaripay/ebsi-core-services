import { IsEthereumAddress } from "class-validator";

import { ArgsAddIssuerProxy } from "../sendSignedTransaction/index.ts";

export class AddIssuerProxyParam extends ArgsAddIssuerProxy {
  @IsEthereumAddress()
  from!: string;
}
