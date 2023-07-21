import { IsMultibase64urlEncoded } from "@ebsiint-api/shared";

export class GetTimestampDto {
  @IsMultibase64urlEncoded()
  timestampId: string;
}

export default GetTimestampDto;
