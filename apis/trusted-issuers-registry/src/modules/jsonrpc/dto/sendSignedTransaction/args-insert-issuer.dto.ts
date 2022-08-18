import { IsHexadecimal } from "class-validator";
import { IsDidV1 } from "../../../../shared/validators";

export class ArgsInsertIssuer {
  @IsDidV1()
  did: string;

  @IsHexadecimal()
  attributeData: string;
}

export default ArgsInsertIssuer;
