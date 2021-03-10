import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { UpdateMetadataParam } from "./update-metadata-param.dto";

export class RequestUpdateMetadataDto extends JsonRpcDto {
  @Equals("updateMetadata")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateMetadataParam)
  params: UpdateMetadataParam[];
}

export default RequestUpdateMetadataDto;
