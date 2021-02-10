import { IsEthereumAddress } from "class-validator";
import { ArgsInsertAppInfo } from "../signedTransaction";

export class InsertAppInfoParam extends ArgsInsertAppInfo {
  @IsEthereumAddress()
  from: string;
}

export default { InsertAppInfoParam };
