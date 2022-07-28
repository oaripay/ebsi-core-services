import { IsHexadecimal } from "class-validator";
import { IsDidV1 } from "../../../../shared/validators";

export class ArgsDeleteAppAdministrator {
  @IsHexadecimal()
  applicationId: string;

  @IsDidV1()
  administratorId: string;
}

export default { ArgsDeleteAppAdministrator };
