import { IsBoolean, IsHexadecimal, IsString, Matches } from "class-validator";
import {
  IsDidV1,
  IsPublicKeyHex,
  IsVerificationMethodId,
} from "@ebsiint-api/shared";

export class ArgsAddVerificationMethod {
  @IsDidV1()
  did!: string;

  @IsString()
  @IsVerificationMethodId()
  vMethodId!: string;

  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  @IsPublicKeyHex()
  publicKey!: string;

  @IsBoolean()
  isSecp256k1!: boolean;
}

export default { ArgsAddVerificationMethod };
