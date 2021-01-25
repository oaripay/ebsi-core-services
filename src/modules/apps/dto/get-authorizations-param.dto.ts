import { IsHexadecimal, Length } from "class-validator";

export default class GetAuthorizationsParamDto {
  @IsHexadecimal()
  @Length(66, 66)
  resourceApplicationId: string;
}
