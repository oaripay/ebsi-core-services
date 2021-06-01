import { IsHexadecimal, Length } from "class-validator";

export default class GetPublicKeyDto {
  @IsHexadecimal()
  @Length(66, 66)
  applicationId: string;

  @IsHexadecimal()
  @Length(66, 66)
  publicKeyId: string;
}
