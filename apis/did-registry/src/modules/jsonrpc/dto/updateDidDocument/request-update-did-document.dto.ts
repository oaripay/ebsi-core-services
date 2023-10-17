import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { UpdateDidDocumentParam } from "./update-did-document-param.dto.js";

export class RequestUpdateDidDocumentDto extends JsonRpcDto {
  @Equals("updateDidDocument")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateDidDocumentParam)
  declare params: UpdateDidDocumentParam[];
}

export default RequestUpdateDidDocumentDto;
