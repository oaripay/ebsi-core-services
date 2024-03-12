import { IsHexadecimal, IsString, Length, Matches } from "class-validator";

export default class GetAuthorizationDto {
  @IsString()
  applicationName!: string;

  @IsString()
  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  @Length(66, 66)
  authorizationId!: string;
}
