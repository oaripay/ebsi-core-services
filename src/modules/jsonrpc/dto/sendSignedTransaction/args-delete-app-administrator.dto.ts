import { IsHexadecimal } from "class-validator";
import { IsDid } from "../../../../shared/validators";

export class ArgsDeleteAppAdministrator {
  @IsHexadecimal()
  applicationId: string;

  @IsDid()
  administratorId: string;
}

export default { ArgsDeleteAppAdministrator };
