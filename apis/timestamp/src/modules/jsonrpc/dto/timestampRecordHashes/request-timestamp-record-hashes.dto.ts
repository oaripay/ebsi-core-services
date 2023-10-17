import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { TimestampRecordHashesParam } from "./timestamp-record-hashes-param.dto.js";

export class RequestTimestampRecordHashesDto extends JsonRpcDto {
  @Equals("timestampRecordHashes")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => TimestampRecordHashesParam)
  declare params: TimestampRecordHashesParam[];
}

export default RequestTimestampRecordHashesDto;
