import { IsHexadecimal, Length } from "class-validator";

export default class GetRecordDto {
  @IsHexadecimal()
  @Length(66, 66)
  recordId: string;
}
