import { IsEthereumAddress } from "class-validator";
import { ArgsInsertApp } from "../sendSignedTransaction/index.js";

export class InsertAppParam extends ArgsInsertApp {
  @IsEthereumAddress()
  from!: string;
}

export default { InsertAppParam };
