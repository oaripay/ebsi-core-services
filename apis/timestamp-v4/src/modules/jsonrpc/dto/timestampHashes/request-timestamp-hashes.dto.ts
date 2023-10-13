import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { TimestampHashesParam } from "./timestamp-hashes-param.dto";

export class RequestTimestampHashesDto extends JsonRpcDto {
  @Equals("timestampHashes")
  method!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => TimestampHashesParam)
  params!: TimestampHashesParam[];
}

export default RequestTimestampHashesDto;
