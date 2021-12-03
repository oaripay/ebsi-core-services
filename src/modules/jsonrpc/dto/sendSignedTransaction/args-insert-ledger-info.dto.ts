import { IsString } from "class-validator";
import { IsHexadecimalJSON } from "../../validators";

export class ArgsInsertLedgerInfo {
  @IsString()
  name: string;

  @IsHexadecimalJSON()
  info: string;
}

export default { ArgsInsertLedgerInfo };
