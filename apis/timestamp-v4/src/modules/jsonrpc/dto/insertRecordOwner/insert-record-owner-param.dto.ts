import { IsEthereumAddress } from "class-validator";
import { ArgsInsertRecordOwner } from "../sendSignedTransaction/index.js";

export class InsertRecordOwnerParam extends ArgsInsertRecordOwner {
  @IsEthereumAddress()
  from!: string;
}

export default { InsertRecordOwnerParam };
