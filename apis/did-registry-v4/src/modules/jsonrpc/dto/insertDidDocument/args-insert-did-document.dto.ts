import { IsString, IsHexadecimal, IsInt, Min, Equals } from "class-validator";
import {
  IsDidV1,
  IsBaseDocument,
  IsVerificationMethodId,
  IsPublicKeyHex,
} from "@ebsiint-api/shared";

export class ArgsInsertDidDocument {
  @IsDidV1()
  did: string;

  @IsBaseDocument()
  baseDocument: string;

  @IsString()
  @IsVerificationMethodId()
  vMethodId: string;

  @IsHexadecimal()
  @IsPublicKeyHex()
  publicKey: string;

  @Equals(true)
  isSecp256k1: boolean;

  @IsInt()
  @Min(0)
  notBefore: number;

  @IsInt()
  @Min(0)
  notAfter: number;
}

export default { ArgsInsertDidDocument };
