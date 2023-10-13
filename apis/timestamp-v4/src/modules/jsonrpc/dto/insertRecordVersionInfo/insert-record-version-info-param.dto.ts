import { IsEthereumAddress } from "class-validator";
import { ArgsInsertRecordVersionInfo } from "../sendSignedTransaction";

export class InsertRecordVersionInfoParam extends ArgsInsertRecordVersionInfo {
  @IsEthereumAddress()
  from!: string;
}

export default { InsertRecordVersionInfoParam };
