import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateIssuerProxy } from "../sendSignedTransaction/index.js";

export class UpdateIssuerProxyParam extends ArgsUpdateIssuerProxy {
  @IsEthereumAddress()
  from!: string;
}

export default { UpdateIssuerProxyParam };
