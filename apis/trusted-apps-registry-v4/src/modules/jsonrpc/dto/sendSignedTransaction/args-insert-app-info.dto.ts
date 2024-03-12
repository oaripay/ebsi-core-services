import { IsHexadecimal, Matches } from "class-validator";
import { IsHexadecimalJSON } from "../../validators/index.js";

export class ArgsInsertAppInfo {
  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  applicationId!: string;

  @IsHexadecimalJSON()
  info!: string;
}

export default { ArgsInsertAppInfo };
