import {
  IsString,
  IsHexadecimal,
  IsInt,
  Min,
  IsBoolean,
} from "class-validator";

import {
  IsDidV1,
  IsVerificationMethodId,
  IsPublicKeyHex,
} from "../../../../shared/validators";

export class ArgsRollVerificationMethod {
  @IsDidV1()
  did: string;

  @IsString()
  @IsVerificationMethodId()
  vMethodId: string;

  @IsHexadecimal()
  @IsPublicKeyHex()
  publicKey: string;

  @IsBoolean()
  isSecp256k1: boolean;

  @IsInt()
  @Min(0)
  notBefore: number;

  @IsInt()
  @Min(0)
  notAfter: number;

  @IsString()
  oldVMethodId: string;

  @IsInt()
  @Min(0)
  duration: number;
}

export default { ArgsRollVerificationMethod };
