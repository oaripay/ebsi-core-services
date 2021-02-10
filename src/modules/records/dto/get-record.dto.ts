import { IsMultibase64urlEncoded } from "../../../shared/validators";

export default class GetRecordDto {
  @IsMultibase64urlEncoded()
  recordId: string;
}
