import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateIssuer } from "../signedTransaction";

export class UpdateIssuerParam extends ArgsUpdateIssuer {
  @IsEthereumAddress()
  from: string;
}

export default UpdateIssuerParam;
