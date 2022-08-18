import { IsMultibase64urlEncoded } from "../../../shared/validators";

export class GetTimestampDto {
  @IsMultibase64urlEncoded()
  timestampId: string;
}

export default GetTimestampDto;
