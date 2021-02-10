import { IsEthereumAddress } from "class-validator";
import { ArgsInsertRevocation } from "../signedTransaction";

export class InsertRevocationParam extends ArgsInsertRevocation {
  @IsEthereumAddress()
  from: string;
}

export default { InsertRevocationParam };
