import { IsBaseDocument, IsDidV1, IsPublicKeyHex } from "@ebsiint-api/shared";
import {
  Equals,
  IsHexadecimal,
  IsInt,
  IsString,
  Matches,
  Min,
} from "class-validator";

export class ArgsInsertDidDocument {
  @IsDidV1()
  did!: string;

  @IsBaseDocument()
  baseDocument!: string;

  @IsString()
  vMethodId!: string;

  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  @IsPublicKeyHex()
  publicKey!: string;

  @Equals(true)
  isSecp256k1!: true;

  @IsInt()
  @Min(0)
  notBefore!: number;

  @IsInt()
  @Min(0)
  notAfter!: number;
}
