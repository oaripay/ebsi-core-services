import { IsLowercase, IsHexadecimal, IsOptional } from "class-validator";
import { IsDid } from "../../../../shared/validators";

export class ArgsUpdateAdministrator {
  @IsDid()
  @IsLowercase()
  did: string;

  @IsHexadecimal()
  attributeData: string;

  @IsOptional()
  @IsHexadecimal()
  prevAttributeHash?: string;
}

export default { ArgsUpdateAdministrator };
