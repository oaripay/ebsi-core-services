import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateLedgerName } from "../sendSignedTransaction";

export class UpdateLedgerNameParam extends ArgsUpdateLedgerName {
  @IsEthereumAddress()
  from: string;
}

export default { ArgsUpdateLedgerName };
