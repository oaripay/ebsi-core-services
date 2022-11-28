import { IsHexadecimal } from "class-validator";
import { IsDidV1 } from "@ebsiint-api/shared";

export class ArgsDeleteAppAdministrator {
  @IsHexadecimal()
  applicationId: string;

  @IsDidV1()
  administratorId: string;
}

export default { ArgsDeleteAppAdministrator };
