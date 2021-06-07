import { IsHexadecimal, IsOptional, Validate } from "class-validator";
import { IsDidRule } from "../../validators";

export class ArgsUpdateAdministrator {
  @Validate(IsDidRule)
  did: string;

  @IsHexadecimal()
  attributeData: string;

  @IsOptional()
  @IsHexadecimal()
  prevAttributeHash?: string;
}

export default { ArgsUpdateAdministrator };
