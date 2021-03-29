import { IsEthereumAddress } from "class-validator";
import { ArgsInsertDidMethod } from "../signedTransaction";

export class InsertDidMethodParam extends ArgsInsertDidMethod {
  @IsEthereumAddress()
  from: string;
}

export default { InsertDidMethodParam };
