import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  ValidateNested,
} from "class-validator";

import { JsonRpcDto } from "../jsonrpc.dto.js";
import { InsertDidDocumentParam } from "./insert-did-document-param.dto.js";

export class RequestInsertDidDocumentDto extends JsonRpcDto {
  @Equals("insertDidDocument")
  declare method: "insertDidDocument";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertDidDocumentParam)
  declare params: InsertDidDocumentParam[];
}

export default RequestInsertDidDocumentDto;
