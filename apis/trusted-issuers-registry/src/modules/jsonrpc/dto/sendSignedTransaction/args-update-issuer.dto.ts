import { IsHexadecimal, IsOptional } from "class-validator";
import { IsDidV1 } from "@ebsiint-api/shared";

export class ArgsUpdateIssuer {
  @IsDidV1()
  did: string;

  @IsHexadecimal()
  attributeData: string;

  @IsOptional()
  @IsHexadecimal()
  prevAttributeHash: string;
}

export default ArgsUpdateIssuer;
