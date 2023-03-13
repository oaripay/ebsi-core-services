import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { InsertDidDocumentParam } from "./insert-did-document-param.dto";

export class RequestInsertDidDocumentDto extends JsonRpcDto {
  @Equals("insertDidDocument")
  method!: "insertDidDocument";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertDidDocumentParam)
  params!: InsertDidDocumentParam[];
}

export default RequestInsertDidDocumentDto;
