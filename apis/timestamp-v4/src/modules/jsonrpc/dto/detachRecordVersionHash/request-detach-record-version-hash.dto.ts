import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { DetachRecordVersionHashParam } from "./detach-record-version-hash-param.dto";

export class RequestDetachRecordVersionHashDto extends JsonRpcDto {
  @Equals("detachRecordVersionHash")
  method!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @ValidateNested({ each: true })
  @Type(() => DetachRecordVersionHashParam)
  params!: DetachRecordVersionHashParam[];
}

export default RequestDetachRecordVersionHashDto;
