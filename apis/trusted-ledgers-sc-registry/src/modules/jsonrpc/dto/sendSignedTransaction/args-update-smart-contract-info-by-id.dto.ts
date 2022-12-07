import { IsHexadecimal } from "class-validator";
import { IsHexadecimalJSON } from "../../validators";

export class ArgsUpdateSmartContractInfoById {
  @IsHexadecimal()
  smartContractInfoId: string;

  @IsHexadecimalJSON()
  info: string;
}

export default { ArgsUpdateSmartContractInfoById };
