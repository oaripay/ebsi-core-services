import { IsEthereumAddress } from "class-validator";
import { ArgsInsertLedgerInfo } from "../signedTransaction";

export class InsertLedgerInfoParam extends ArgsInsertLedgerInfo {
  @IsEthereumAddress()
  from: string;
}

export default { InsertLedgerInfoParam };
