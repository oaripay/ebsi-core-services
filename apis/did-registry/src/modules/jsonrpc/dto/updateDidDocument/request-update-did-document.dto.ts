import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { UpdateDidDocumentParam } from "./update-did-document-param.dto";

export class RequestUpdateDidDocumentDto extends JsonRpcDto {
  @Equals("updateDidDocument")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateDidDocumentParam)
  params: UpdateDidDocumentParam[];
}

export default RequestUpdateDidDocumentDto;
