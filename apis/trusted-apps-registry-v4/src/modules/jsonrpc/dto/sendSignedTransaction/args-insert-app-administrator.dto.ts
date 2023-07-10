import { IsHexadecimal } from "class-validator";
import { IsDidV1 } from "@ebsiint-api/shared";

export class ArgsInsertAppAdministrator {
  @IsHexadecimal()
  applicationId: string;

  @IsDidV1()
  administratorId: string;
}

export default { ArgsInsertAppAdministrator };
