import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateIssuerProxy } from "../sendSignedTransaction";

export class UpdateIssuerProxyParam extends ArgsUpdateIssuerProxy {
  @IsEthereumAddress()
  from: string;
}

export default { UpdateIssuerProxyParam };
