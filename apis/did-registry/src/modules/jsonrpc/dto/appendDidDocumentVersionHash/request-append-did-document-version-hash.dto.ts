import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { AppendDidDocumentVersionHashParam } from "./append-did-document-version-hash-param.dto.js";

export class RequestAppendDidDocumentVersionHashDto extends JsonRpcDto {
  @Equals("appendDidDocumentVersionHash")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => AppendDidDocumentVersionHashParam)
  declare params: AppendDidDocumentVersionHashParam[];
}

export default RequestAppendDidDocumentVersionHashDto;
