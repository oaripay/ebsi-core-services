import {
  IsString,
  IsHexadecimal,
  IsInt,
  Min,
  Equals,
  Matches,
} from "class-validator";
import { IsDidV1, IsBaseDocument, IsPublicKeyHex } from "@ebsiint-api/shared";

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

export default { ArgsInsertDidDocument };
