import { IsLowercase } from "class-validator";
import { IsDid, IsHexadecimalAdminAttribute } from "../../validators";

export class ArgsInsertAdministrator {
  @IsDid()
  @IsLowercase()
  did: string;

  @IsHexadecimalAdminAttribute()
  attributeData: string;
}

export default { ArgsInsertAdministrator };
