import { IsMultibase64urlEncoded } from "../validators";

export class GetTimestampDto {
  @IsMultibase64urlEncoded()
  timestampId: string;
}

export default GetTimestampDto;
