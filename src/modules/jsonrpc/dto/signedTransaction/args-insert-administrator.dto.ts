import { IsHexadecimal, Validate } from "class-validator";
import { IsDidRule } from "../../validators";

export class ArgsInsertAdministrator {
  @Validate(IsDidRule)
  did: string;

  @IsHexadecimal()
  attributeData: string;
}

export default { ArgsInsertAdministrator };
