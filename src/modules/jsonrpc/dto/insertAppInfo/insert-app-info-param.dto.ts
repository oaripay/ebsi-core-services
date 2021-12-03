import { IsEthereumAddress } from "class-validator";
import { ArgsInsertAppInfo } from "../sendSignedTransaction";

export class InsertAppInfoParam extends ArgsInsertAppInfo {
  @IsEthereumAddress()
  from: string;
}

export default { InsertAppInfoParam };
