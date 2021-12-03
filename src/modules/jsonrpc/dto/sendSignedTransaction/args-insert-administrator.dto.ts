import { Validate } from "class-validator";
import { IsDidRule, IsHexadecimalAdminAttribute } from "../../validators";

export class ArgsInsertAdministrator {
  @Validate(IsDidRule)
  did: string;

  @IsHexadecimalAdminAttribute()
  attributeData: string;
}

export default { ArgsInsertAdministrator };
