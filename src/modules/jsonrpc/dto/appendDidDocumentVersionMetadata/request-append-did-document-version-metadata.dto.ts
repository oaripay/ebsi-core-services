import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { AppendDidDocumentVersionMetadataParam } from "./append-did-document-version-metadata-param.dto";

export class RequestAppendDidDocumentVersionMetadataDto extends JsonRpcDto {
  @Equals("appendDidDocumentVersionMetadata")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => AppendDidDocumentVersionMetadataParam)
  params: AppendDidDocumentVersionMetadataParam[];
}

export default RequestAppendDidDocumentVersionMetadataDto;
