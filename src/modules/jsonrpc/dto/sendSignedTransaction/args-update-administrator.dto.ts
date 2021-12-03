import { IsHexadecimal, IsOptional } from "class-validator";
import { IsDid, IsHexadecimalAdminAttribute } from "../../validators";

export class ArgsUpdateAdministrator {
  @IsDid()
  did: string;

  @IsHexadecimalAdminAttribute()
  attributeData: string;

  @IsOptional()
  @IsHexadecimal()
  prevAttributeHash: string;
}

export default ArgsUpdateAdministrator;
