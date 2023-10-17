import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { DetachDidDocumentVersionMetadataParam } from "./detach-did-document-version-metadata-param.dto.js";

export class RequestDetachDidDocumentVersionMetadataDto extends JsonRpcDto {
  @Equals("detachDidDocumentVersionMetadata")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => DetachDidDocumentVersionMetadataParam)
  declare params: DetachDidDocumentVersionMetadataParam[];
}

export default RequestDetachDidDocumentVersionMetadataDto;
