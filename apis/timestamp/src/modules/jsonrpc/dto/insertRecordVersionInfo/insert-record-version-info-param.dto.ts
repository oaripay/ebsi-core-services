import { IsEthereumAddress } from "class-validator";
import { ArgsInsertRecordVersionInfo } from "../sendSignedTransaction/index.js";

export class InsertRecordVersionInfoParam extends ArgsInsertRecordVersionInfo {
  @IsEthereumAddress()
  from!: string;
}

export default { InsertRecordVersionInfoParam };
