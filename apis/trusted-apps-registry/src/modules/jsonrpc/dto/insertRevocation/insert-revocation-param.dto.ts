import { IsEthereumAddress } from "class-validator";
import { ArgsInsertRevocation } from "../sendSignedTransaction";

export class InsertRevocationParam extends ArgsInsertRevocation {
  @IsEthereumAddress()
  from: string;
}

export default { InsertRevocationParam };
