import { IsEthereumAddress } from "class-validator";
import { ArgsInsertRecordVersionInfo } from "../signedTransaction";

export class InsertRecordVersionInfoParam extends ArgsInsertRecordVersionInfo {
  @IsEthereumAddress()
  from: string;
}

export default { InsertRecordVersionInfoParam };
