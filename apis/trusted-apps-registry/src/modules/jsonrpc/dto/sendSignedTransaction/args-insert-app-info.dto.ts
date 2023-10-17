import { IsHexadecimal } from "class-validator";
import { IsHexadecimalJSON } from "../../validators/index.js";

export class ArgsInsertAppInfo {
  @IsHexadecimal()
  applicationId!: string;

  @IsHexadecimalJSON()
  info!: string;
}

export default { ArgsInsertAppInfo };
