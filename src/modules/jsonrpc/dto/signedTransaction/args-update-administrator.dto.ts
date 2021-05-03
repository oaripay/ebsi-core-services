import { IsHexadecimal, IsOptional } from "class-validator";
import { IsDid } from "../../../../shared/validators";

export class ArgsUpdateAdministrator {
  @IsDid()
  did: string;

  @IsHexadecimal()
  attributeData: string;

  @IsOptional()
  @IsHexadecimal()
  prevAttributeHash?: string;
}

export default { ArgsUpdateAdministrator };
