import { IsEthereumAddress } from "class-validator";
import { ArgsInsertRecordOwner } from "../sendSignedTransaction";

export class InsertRecordOwnerParam extends ArgsInsertRecordOwner {
  @IsEthereumAddress()
  from!: string;
}

export default { InsertRecordOwnerParam };
