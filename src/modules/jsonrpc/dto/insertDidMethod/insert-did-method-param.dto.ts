import { IsEthereumAddress } from "class-validator";
import { ArgsInsertDidMethod } from "../sendSignedTransaction";

export class InsertDidMethodParam extends ArgsInsertDidMethod {
  @IsEthereumAddress()
  from: string;
}

export default { InsertDidMethodParam };
