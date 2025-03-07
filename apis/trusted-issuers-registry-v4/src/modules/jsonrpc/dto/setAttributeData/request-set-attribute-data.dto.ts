import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  ValidateNested,
} from "class-validator";

import { JsonRpcDto } from "../jsonrpc.dto.ts";
import { SetAttributeDataParam } from "./set-attribute-data-param.dto.ts";

export class RequestSetAttributeDataDto extends JsonRpcDto {
  @Equals("setAttributeData")
  declare method: "setAttributeData";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => SetAttributeDataParam)
  declare params: SetAttributeDataParam[];
}

export default RequestSetAttributeDataDto;
