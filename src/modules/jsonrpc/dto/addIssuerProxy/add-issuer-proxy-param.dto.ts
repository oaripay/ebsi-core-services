import { IsEthereumAddress } from "class-validator";
import { ArgsAddIssuerProxy } from "../sendSignedTransaction";

export class AddIssuerProxyParam extends ArgsAddIssuerProxy {
  @IsEthereumAddress()
  from: string;
}

export default { AddIssuerProxyParam };
