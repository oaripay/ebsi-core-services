import { IsHexadecimal, IsString } from "class-validator";
import { IsDid } from "../../validators";

export class ArgsInsertAppAdministrator {
  @IsHexadecimal()
  applicationId: string;

  @IsDid()
  administratorId: string;
}

export default { ArgsInsertAppAdministrator };
