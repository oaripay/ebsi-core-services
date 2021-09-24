import { IsHexadecimal } from "class-validator";
import { IsDid } from "../../../../shared/validators";

export class ArgsInsertAppAdministrator {
  @IsHexadecimal()
  applicationId: string;

  @IsDid()
  administratorId: string;
}

export default { ArgsInsertAppAdministrator };
