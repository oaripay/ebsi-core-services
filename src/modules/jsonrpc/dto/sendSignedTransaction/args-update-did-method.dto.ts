import {
  IsHexadecimal,
  IsNumber,
  IsString,
  Matches,
  Max,
  Min,
} from "class-validator";
import { IsHexadecimalJson } from "../../validators";

export class ArgsUpdateDidMethod {
  @IsString()
  @Matches(/^did:/, {
    message: "methodName must start with 'did:'",
  })
  methodName: string;

  // TODO: check in TLSCR API if the ledger exists
  @IsString()
  ledgerName: string;

  @Matches(/^0x/, { each: true, message: "each methodSpec must start with 0x" })
  @IsHexadecimalJson({
    each: true,
    message:
      "each methodSpec must be a valid JSON document encoded in hexadecimal",
  })
  methodSpec: string[];

  @Matches(/^0x/, {
    each: true,
    message: "each methodSpecHash must start with 0x",
  })
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
