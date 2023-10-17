import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { UpdateMetadataParam } from "./update-metadata-param.dto.js";

export class RequestUpdateMetadataDto extends JsonRpcDto {
  @Equals("updateMetadata")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateMetadataParam)
  declare params: UpdateMetadataParam[];
}

export default RequestUpdateMetadataDto;
