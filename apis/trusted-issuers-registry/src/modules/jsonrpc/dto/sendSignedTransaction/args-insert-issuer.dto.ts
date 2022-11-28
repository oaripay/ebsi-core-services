import { IsHexadecimal } from "class-validator";
import { IsDidV1 } from "@ebsiint-api/shared";

export class ArgsInsertIssuer {
  @IsDidV1()
  did: string;

  @IsHexadecimal()
  attributeData: string;
}

export default ArgsInsertIssuer;
