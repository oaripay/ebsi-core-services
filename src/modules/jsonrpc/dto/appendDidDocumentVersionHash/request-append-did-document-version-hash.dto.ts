import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { AppendDidDocumentVersionParam } from "./append-did-document-version-hash-param.dto";

export class RequestAppendDidDocumentVersionHashDto extends JsonRpcDto {
  @Equals("appendDidDocumentVersionHash")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => AppendDidDocumentVersionParam)
  params: AppendDidDocumentVersionParam[];
}

export default RequestAppendDidDocumentVersionHashDto;
