import { IsHexadecimal, Length } from "class-validator";

export default class GetAuthorizationDto {
  applicationName: string;

  @IsHexadecimal()
  @Length(66, 66)
  authorizationId: string;
}
