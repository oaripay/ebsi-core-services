import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { TimestampRecordVersionHashesParam } from "./timestamp-record-version-hashes-param.dto";

export class RequestTimestampRecordVersionHashesDto extends JsonRpcDto {
  @Equals("timestampRecordVersionHashes")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => TimestampRecordVersionHashesParam)
  params: TimestampRecordVersionHashesParam[];
}

export default RequestTimestampRecordVersionHashesDto;
