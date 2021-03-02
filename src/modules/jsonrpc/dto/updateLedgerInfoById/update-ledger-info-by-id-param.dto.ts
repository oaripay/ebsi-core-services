import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateLedgerInfoById } from "../signedTransaction";

export class UpdateLedgerInfoByIdParam extends ArgsUpdateLedgerInfoById {
  @IsEthereumAddress()
  from: string;
}

export default { UpdateLedgerInfoByIdParam };
