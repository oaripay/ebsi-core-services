import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { TimestampRecordVersionHashesParam } from "./timestamp-record-version-hashes-param.dto.js";

export class RequestTimestampRecordVersionHashesDto extends JsonRpcDto {
  @Equals("timestampRecordVersionHashes")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => TimestampRecordVersionHashesParam)
  declare params: TimestampRecordVersionHashesParam[];
}

export default RequestTimestampRecordVersionHashesDto;
