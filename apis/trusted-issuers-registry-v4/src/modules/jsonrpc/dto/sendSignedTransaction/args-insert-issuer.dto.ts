import { IsHexadecimal, IsNumber, Max, Min } from "class-validator";
import { IsDidV1 } from "@ebsiint-api/shared";

export class ArgsInsertIssuer {
  @IsDidV1()
  did!: string;

  @IsHexadecimal()
  attributeData!: string;

  // Undefined, RootTAO, TAO, TI, Revoked
  @IsNumber()
  @Min(0)
  @Max(4)
  issuerType!: number;

  @IsDidV1()
  taoDid!: string;

  @IsHexadecimal()
  taoAttributeId!: string;
}

export default ArgsInsertIssuer;
