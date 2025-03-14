import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  ValidateNested,
} from "class-validator";

import { JsonRpcDto } from "../jsonrpc.dto.ts";
import { UpdateBaseDocumentParam } from "./update-base-document-param.dto.ts";

export class RequestUpdateBaseDocumentDto extends JsonRpcDto {
  @Equals("updateBaseDocument")
  declare method: "updateBaseDocument";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateBaseDocumentParam)
  declare params: UpdateBaseDocumentParam[];
}
