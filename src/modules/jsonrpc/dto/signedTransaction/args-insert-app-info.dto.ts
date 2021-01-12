import { IsHexadecimal } from "class-validator";

export class ArgsInsertAppInfo {
  @IsHexadecimal()
  applicationId: string;

  @IsHexadecimal()
  info: string;
}

export default { ArgsInsertAppInfo };
