import { IsHexadecimal, Length } from "class-validator";

export default class GetPublicKeysParamDto {
  @IsHexadecimal()
  @Length(66, 66)
  applicationId: string;
}
