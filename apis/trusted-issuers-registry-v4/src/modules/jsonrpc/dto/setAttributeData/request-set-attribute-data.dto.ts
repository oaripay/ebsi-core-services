import {
  IsArray,
  Equals,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { SetAttributeDataParam } from "./set-attribute-data-param.dto.js";

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
