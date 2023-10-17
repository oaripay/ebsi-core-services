import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { DetachDidDocumentVersionParam } from "./detach-did-document-version-hash-param.dto.js";

export class RequestDetachDidDocumentVersionHashDto extends JsonRpcDto {
  @Equals("detachDidDocumentVersionHash")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => DetachDidDocumentVersionParam)
  declare params: DetachDidDocumentVersionParam[];
}

export default RequestDetachDidDocumentVersionHashDto;
