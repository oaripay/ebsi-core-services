import {
  IsArray,
  Equals,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { SetAttributeMetadataParam } from "./set-attribute-metadata-param.dto.js";

export class RequestSetAttributeMetadataDto extends JsonRpcDto {
  @Equals("setAttributeMetadata")
  declare method: "setAttributeMetadata";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => SetAttributeMetadataParam)
  declare params: SetAttributeMetadataParam[];
}

export default RequestSetAttributeMetadataDto;
