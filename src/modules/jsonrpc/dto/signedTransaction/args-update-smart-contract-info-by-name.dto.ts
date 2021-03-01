import { IsString } from "class-validator";
import { IsHexadecimalJSON } from "../../validators";

export class ArgsUpdateSmartContractInfoByName {
  @IsString()
  name: string;

  @IsHexadecimalJSON()
  info: string;
}

export default { ArgsUpdateSmartContractInfoByName };
