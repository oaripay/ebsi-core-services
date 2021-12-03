import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateIssuer } from "../sendSignedTransaction";

export class UpdateIssuerParam extends ArgsUpdateIssuer {
  @IsEthereumAddress()
  from: string;
}

export default UpdateIssuerParam;
