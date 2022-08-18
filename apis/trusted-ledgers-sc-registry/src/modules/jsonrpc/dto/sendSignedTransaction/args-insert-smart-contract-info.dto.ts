import { IsString } from "class-validator";
import { IsHexadecimalJSON } from "../../validators";

export class ArgsInsertSmartContractInfo {
  @IsString()
  name: string;

  @IsHexadecimalJSON()
  info: string;
}

export default { ArgsInsertSmartContractInfo };
