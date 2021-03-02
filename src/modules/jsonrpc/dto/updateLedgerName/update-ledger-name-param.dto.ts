import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateLedgerName } from "../signedTransaction";

export class UpdateLedgerNameParam extends ArgsUpdateLedgerName {
  @IsEthereumAddress()
  from: string;
}

export default { ArgsUpdateLedgerName };
