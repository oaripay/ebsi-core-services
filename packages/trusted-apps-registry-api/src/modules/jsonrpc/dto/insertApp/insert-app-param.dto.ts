import { IsEthereumAddress } from "class-validator";
import { ArgsInsertApp } from "../sendSignedTransaction";

export class InsertAppParam extends ArgsInsertApp {
  @IsEthereumAddress()
  from: string;
}

export default { InsertAppParam };
