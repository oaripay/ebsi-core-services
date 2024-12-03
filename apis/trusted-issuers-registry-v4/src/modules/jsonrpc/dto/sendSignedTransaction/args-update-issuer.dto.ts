import { IsDidV1 } from "@ebsiint-api/shared";
import {
  IsHexadecimal,
  IsNumber,
  IsOptional,
  Matches,
  Max,
  Min,
} from "class-validator";

export class ArgsUpdateIssuer {
  @IsDidV1()
  did!: string;

  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  attributeData!: string;

  @IsOptional()
  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  prevAttributeHash?: string;

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

export default ArgsUpdateIssuer;
