import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { DetachDidDocumentVersionParam } from "./detach-did-document-version-hash-param.dto";

export class RequestDetachDidDocumentVersionHashDto extends JsonRpcDto {
  @Equals("detachDidDocumentVersionHash")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => DetachDidDocumentVersionParam)
  params: DetachDidDocumentVersionParam[];
}

export default RequestDetachDidDocumentVersionHashDto;
