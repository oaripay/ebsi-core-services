import { IsMultibase64urlEncoded } from "../../../shared/validators";

export class GetTimestampParamsDto {
  @IsMultibase64urlEncoded()
  timestampId: string;
}

export default GetTimestampParamsDto;
