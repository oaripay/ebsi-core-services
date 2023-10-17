import { IsHexadecimal, Matches } from "class-validator";
import { GetIdentifierParamsDto } from "./get-identifier.params.dto.js";

export class GetIdentifierVersionParamsDto extends GetIdentifierParamsDto {
  @IsHexadecimal()
  @Matches(/^0x/)
  "versionId": string;
}

export default GetIdentifierVersionParamsDto;
