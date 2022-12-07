import { IsString } from "class-validator";
import { IsHexadecimalJSON } from "../../validators";

export class ArgsUpdateLedgerInfoByName {
  @IsString()
  name: string;

  @IsHexadecimalJSON()
  info: string;
}

export default { ArgsUpdateLedgerInfoByName };
