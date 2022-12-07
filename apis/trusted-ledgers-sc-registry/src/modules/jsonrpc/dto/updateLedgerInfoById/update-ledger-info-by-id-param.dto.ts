import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateLedgerInfoById } from "../sendSignedTransaction";

export class UpdateLedgerInfoByIdParam extends ArgsUpdateLedgerInfoById {
  @IsEthereumAddress()
  from: string;
}

export default { UpdateLedgerInfoByIdParam };
