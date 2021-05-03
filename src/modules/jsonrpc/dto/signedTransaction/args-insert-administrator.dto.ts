import { IsHexadecimal } from "class-validator";
import { IsDid } from "../../../../shared/validators";

export class ArgsInsertAdministrator {
  @IsDid()
  did: string;

  @IsHexadecimal()
  attributeData: string;
}

export default { ArgsInsertAdministrator };
