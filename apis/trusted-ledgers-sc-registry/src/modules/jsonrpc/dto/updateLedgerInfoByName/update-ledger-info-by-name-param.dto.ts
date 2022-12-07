import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateLedgerInfoByName } from "../sendSignedTransaction";

export class UpdateLedgerInfoByNameParam extends ArgsUpdateLedgerInfoByName {
  @IsEthereumAddress()
  from: string;
}

export default { UpdateLedgerInfoByNameParam };
