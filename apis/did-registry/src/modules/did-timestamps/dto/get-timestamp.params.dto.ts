import { IsMultibase64urlEncoded } from "@ebsiint-api/shared";

export class GetTimestampParamsDto {
  @IsMultibase64urlEncoded()
  timestampId: string;
}

export default GetTimestampParamsDto;
