import { IsDidV1, IsPublicKeyHex } from "@ebsiint-api/shared";
import { IsBoolean, IsHexadecimal, IsString, Matches } from "class-validator";

export class ArgsAddVerificationMethod {
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
}
