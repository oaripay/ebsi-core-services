import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { DetachRecordVersionHashParam } from "./detach-record-version-hash-param.dto.js";

export class RequestDetachRecordVersionHashDto extends JsonRpcDto {
  @Equals("detachRecordVersionHash")
  declare method: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @ValidateNested({ each: true })
  @Type(() => DetachRecordVersionHashParam)
  declare params: DetachRecordVersionHashParam[];
}

export default RequestDetachRecordVersionHashDto;
