import { IsEthereumAddress } from "class-validator";
import { ArgsInsertIssuer } from "../sendSignedTransaction";

export class InsertIssuerParam extends ArgsInsertIssuer {
  @IsEthereumAddress()
  from: string;
}

export default { InsertIssuerParam };
