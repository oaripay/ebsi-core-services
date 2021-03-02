import { IsHexadecimal } from "class-validator";
import { IsHexadecimalJSON } from "../../validators";

export class ArgsUpdateLedgerInfoById {
  @IsHexadecimal()
  ledgerInfoId: string;

  @IsHexadecimalJSON()
  info: string;
}

export default { ArgsUpdateLedgerInfoById };
