import { IsEthereumAddress } from "class-validator";
import { ArgsInsertIssuer } from "../signedTransaction";

export class InsertIssuerParam extends ArgsInsertIssuer {
  @IsEthereumAddress()
  from: string;
}

export default { InsertIssuerParam };
