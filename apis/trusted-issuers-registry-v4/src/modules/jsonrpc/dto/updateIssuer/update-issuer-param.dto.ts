import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateIssuer } from "../sendSignedTransaction/index.js";

export class UpdateIssuerParam extends ArgsUpdateIssuer {
  @IsEthereumAddress()
  from!: string;
}

export default UpdateIssuerParam;
