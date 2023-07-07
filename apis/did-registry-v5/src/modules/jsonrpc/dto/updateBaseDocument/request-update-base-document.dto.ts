import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { UpdateBaseDocumentParam } from "./update-base-document-param.dto";

export class RequestUpdateBaseDocumentDto extends JsonRpcDto {
  @Equals("updateBaseDocument")
  method!: "updateBaseDocument";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateBaseDocumentParam)
  params!: UpdateBaseDocumentParam[];
}

export default RequestUpdateBaseDocumentDto;
