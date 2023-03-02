import {
  IsArray,
  Equals,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { SetAttributeDataParam } from "./set-attribute-data-param.dto";

export class RequestSetAttributeDataDto extends JsonRpcDto {
  @Equals("setAttributeData")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => SetAttributeDataParam)
  params: SetAttributeDataParam[];
}

export default RequestSetAttributeDataDto;
