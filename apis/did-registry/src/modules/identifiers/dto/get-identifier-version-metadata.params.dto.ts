import { IsHexadecimal, Matches } from "class-validator";
import { GetIdentifierVersionParamsDto } from "./get-identifier-version.params.dto";

export class GetIdentifierVersionMetadataParamsDto extends GetIdentifierVersionParamsDto {
  @IsHexadecimal()
  @Matches(/^0x/)
  "metadataId": string;
}

export default GetIdentifierVersionMetadataParamsDto;
