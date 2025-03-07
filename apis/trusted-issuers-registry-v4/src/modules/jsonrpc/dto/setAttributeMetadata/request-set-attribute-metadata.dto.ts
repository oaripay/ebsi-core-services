import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  ValidateNested,
} from "class-validator";

import { JsonRpcDto } from "../jsonrpc.dto.ts";
import { SetAttributeMetadataParam } from "./set-attribute-metadata-param.dto.ts";

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
