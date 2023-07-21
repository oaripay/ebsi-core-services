import { IsMultibase64urlEncoded } from "@ebsiint-api/shared";

export default class GetRecordDto {
  @IsMultibase64urlEncoded()
  recordId: string;
}
