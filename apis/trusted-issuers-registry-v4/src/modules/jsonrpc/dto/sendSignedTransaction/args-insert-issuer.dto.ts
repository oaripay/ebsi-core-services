import { IsDidV1 } from "@ebsiint-api/shared";
import { IsHexadecimal, IsNumber, Matches, Max, Min } from "class-validator";

export class ArgsInsertIssuer {
  @IsDidV1()
  did!: string;

  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  attributeData!: string;

  // Undefined, RootTAO, TAO, TI, Revoked
  @IsNumber()
  @Min(0)
  @Max(4)
  issuerType!: number;

  @IsDidV1()
  taoDid!: string;

  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  taoAttributeId!: string;
}

export default ArgsInsertIssuer;
