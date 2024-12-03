import { IsDidV1, IsPublicKeyHex } from "@ebsiint-api/shared";
import {
  IsBoolean,
  IsHexadecimal,
  IsInt,
  IsString,
  Matches,
  Min,
} from "class-validator";

export class ArgsRollVerificationMethod {
  @IsDidV1()
  did!: string;

  @IsString()
  vMethodId!: string;

  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  @IsPublicKeyHex()
  publicKey!: string;

  @IsBoolean()
  isSecp256k1!: boolean;

  @IsInt()
  @Min(0)
  notBefore!: number;

  @IsInt()
  @Min(0)
  notAfter!: number;

  @IsString()
  oldVMethodId!: string;

  @IsInt()
  @Min(0)
  duration!: number;
}

export default { ArgsRollVerificationMethod };
