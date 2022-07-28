import { IsHexadecimal, Length } from "class-validator";

export default class GetPublicKeyDto {
  applicationName: string;

  @IsHexadecimal()
  @Length(66, 66)
  publicKeyId: string;
}
