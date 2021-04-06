import { IsHexadecimal, Matches } from "class-validator";

export class GetTimestampParamsDto {
  @IsHexadecimal()
  @Matches(/^0x/)
  timestampId: string;
}

export default GetTimestampParamsDto;
