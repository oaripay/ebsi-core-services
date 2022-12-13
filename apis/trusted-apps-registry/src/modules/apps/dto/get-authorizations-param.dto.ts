import { IsString } from "class-validator";

export default class GetAuthorizationsParamDto {
  @IsString()
  applicationName: string;
}
