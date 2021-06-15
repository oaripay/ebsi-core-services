import { IsHexadecimal, IsOptional } from "class-validator";
import { IsDid } from "../../validators";

export class ArgsUpdateAdministrator {
  @IsDid()
  did: string;

  @IsHexadecimal()
  attributeData: string;

  @IsOptional()
  @IsHexadecimal()
  prevAttributeHash: string;
}

export default { ArgsUpdateAdministrator };
