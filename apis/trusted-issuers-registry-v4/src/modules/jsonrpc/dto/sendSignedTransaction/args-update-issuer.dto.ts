import { IsHexadecimal, IsNumber, IsOptional, Max, Min } from "class-validator";
import { IsDidV1 } from "@ebsiint-api/shared";

export class ArgsUpdateIssuer {
  @IsDidV1()
  did: string;

  @IsHexadecimal()
  attributeData: string;

  @IsOptional()
  @IsHexadecimal()
  prevAttributeHash: string;

  // Undefined, RootTAO, TAO, TI, Revoked
  @IsNumber()
  @Min(0)
  @Max(4)
  issuerType: number;

  @IsDidV1()
  taoDid: string;

  @IsHexadecimal()
  taoAttributeId: string;
}

export default ArgsUpdateIssuer;
