import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { AppendDidDocumentVersionMetadataParam } from "./append-did-document-version-metadata-param.dto.js";

export class RequestAppendDidDocumentVersionMetadataDto extends JsonRpcDto {
  @Equals("appendDidDocumentVersionMetadata")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => AppendDidDocumentVersionMetadataParam)
  declare params: AppendDidDocumentVersionMetadataParam[];
}

export default RequestAppendDidDocumentVersionMetadataDto;
