import { IsHexadecimal, IsOptional, Validate } from "class-validator";
import { IsDidRule, IsHexadecimalAdminAttribute } from "../../validators";

export class ArgsUpdateAdministrator {
  @Validate(IsDidRule)
  did: string;

  @IsHexadecimalAdminAttribute()
  attributeData: string;

  @IsOptional()
  @IsHexadecimal()
  prevAttributeHash?: string;
}

export default { ArgsUpdateAdministrator };
