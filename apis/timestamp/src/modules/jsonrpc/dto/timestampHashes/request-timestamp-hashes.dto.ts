import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { TimestampHashesParam } from "./timestamp-hashes-param.dto.js";

export class RequestTimestampHashesDto extends JsonRpcDto {
  @Equals("timestampHashes")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => TimestampHashesParam)
  declare params: TimestampHashesParam[];
}

export default RequestTimestampHashesDto;
