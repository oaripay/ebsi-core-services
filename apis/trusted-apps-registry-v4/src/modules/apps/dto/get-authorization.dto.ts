import { IsHexadecimal, IsString, Length } from "class-validator";

export default class GetAuthorizationDto {
  @IsString()
  applicationName!: string;

  @IsString()
  @IsHexadecimal()
  @Length(66, 66)
  authorizationId!: string;
}
