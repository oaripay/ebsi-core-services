import { IsString } from "class-validator";

export default class GetAppDto {
  @IsString()
  applicationName: string;
}
