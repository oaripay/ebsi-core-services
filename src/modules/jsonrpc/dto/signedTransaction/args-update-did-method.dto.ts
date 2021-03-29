import {
  IsHexadecimal,
  IsNumber,
  IsString,
  Matches,
  Max,
  Min,
} from "class-validator";
import { IsHexadecimalJsonLd } from "../../validators";

export class ArgsUpdateDidMethod {
  @IsString()
  methodName: string;

  @IsString()
  ledgerName: string;

  @IsHexadecimalJsonLd({ each: true })
  methodSpec: string[];

  @Matches(/^0x/, { each: true })
  @IsHexadecimal({ each: true })
  methodSpecHash: string[];

  // Unix timestamp
  @IsNumber()
  @Min(0)
  notBefore: number;

  // Unix timestamp
  @IsNumber()
  @Min(0)
  notAfter: number;

  // Status (1: active, 2: revoked, 3: suspended)
  @IsNumber()
  @Min(1)
  @Max(3)
  status: number;
}

export default { ArgsUpdateDidMethod };
