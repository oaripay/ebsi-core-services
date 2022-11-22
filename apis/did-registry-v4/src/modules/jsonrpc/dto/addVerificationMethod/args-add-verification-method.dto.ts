import { IsBoolean, IsHexadecimal, IsString } from "class-validator";
import {
  IsDidV1,
  IsPublicKeyHex,
  IsVerificationMethodId,
} from "../../../../shared/validators";

export class ArgsAddVerificationMethod {
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
}

export default { ArgsAddVerificationMethod };
