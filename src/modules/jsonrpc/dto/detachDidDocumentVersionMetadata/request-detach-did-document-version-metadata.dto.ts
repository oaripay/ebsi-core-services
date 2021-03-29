import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { DetachDidDocumentVersionMetadataParam } from "./detach-did-document-version-metadata-param.dto";

export class RequestDetachDidDocumentVersionMetadataDto extends JsonRpcDto {
  @Equals("detachDidDocumentVersionMetadata")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => DetachDidDocumentVersionMetadataParam)
  params: DetachDidDocumentVersionMetadataParam[];
}

export default RequestDetachDidDocumentVersionMetadataDto;
