import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { TimestampRecordHashesParam } from "./timestamp-record-hashes-param.dto";

export class RequestTimestampRecordHashesDto extends JsonRpcDto {
  @Equals("timestampRecordHashes")
  method!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => TimestampRecordHashesParam)
  params!: TimestampRecordHashesParam[];
}

export default RequestTimestampRecordHashesDto;
