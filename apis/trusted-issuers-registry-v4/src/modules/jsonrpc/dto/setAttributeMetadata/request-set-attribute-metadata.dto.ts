import {
  IsArray,
  Equals,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { SetAttributeMetadataParam } from "./set-attribute-metadata-param.dto";

export class RequestSetAttributeMetadataDto extends JsonRpcDto {
  @Equals("setAttributeMetadata")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => SetAttributeMetadataParam)
  params: SetAttributeMetadataParam[];
}

export default RequestSetAttributeMetadataDto;
