import { IsHexadecimal, IsString, Length } from "class-validator";

export default class GetPublicKeyDto {
  @IsString()
  applicationName: string;

  @IsString()
  @IsHexadecimal()
  @Length(66, 66)
  publicKeyId: string;
}
