import { IsEthereumAddress } from "class-validator";
import { ArgsInsertApp } from "../signedTransaction";

export class InsertAppParam extends ArgsInsertApp {
  @IsEthereumAddress()
  from: string;
}

export default { InsertAppParam };
