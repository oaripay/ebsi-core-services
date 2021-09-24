import { IsHexadecimal, IsOptional } from "class-validator";
import { IsHexadecimalAdminAttribute } from "../../validators";
import { IsDid } from "../../../../shared/validators";

export class ArgsUpdateAdministrator {
  @IsDid()
  did: string;

  @IsHexadecimalAdminAttribute()
  attributeData: string;

  @IsOptional()
  @IsHexadecimal()
  prevAttributeHash: string;
}

export default { ArgsUpdateAdministrator };
