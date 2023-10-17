import { IsString } from "class-validator";

export default class GetPublicKeysParamDto {
  @IsString()
  applicationName!: string;
}
