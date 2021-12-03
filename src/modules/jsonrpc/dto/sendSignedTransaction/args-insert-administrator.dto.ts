import { IsHexadecimalAdminAttribute } from "../../validators";
import { IsDid } from "../../../../shared/validators";

export class ArgsInsertAdministrator {
  @IsDid()
  did: string;

  @IsHexadecimalAdminAttribute()
  attributeData: string;
}

export default { ArgsInsertAdministrator };
