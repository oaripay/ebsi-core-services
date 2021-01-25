import { IsHexadecimal, Length } from "class-validator";

export default class GetAuthorizationDto {
  @IsHexadecimal()
  @Length(66, 66)
  resourceApplicationId: string;

  @IsHexadecimal()
  @Length(66, 66)
  authorizationId: string;
}
