import { IsHexadecimal } from "class-validator";
import { IsDid } from "../../validators";

export class ArgsInsertIssuer {
  @IsDid()
  did: string;

  @IsHexadecimal()
  attributeData: string;
}

export default ArgsInsertIssuer;
