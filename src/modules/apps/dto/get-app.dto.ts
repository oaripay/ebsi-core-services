import { IsHexadecimal, Length } from "class-validator";

export default class GetAppDto {
  @IsHexadecimal()
  @Length(66, 66)
  applicationId: string;
}
