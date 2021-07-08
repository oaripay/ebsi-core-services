import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { TimestampVersionHashesParam } from "./timestamp-version-hashes-param.dto";

export class RequestTimestampVersionHashesDto extends JsonRpcDto {
  @Equals("timestampVersionHashes")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => TimestampVersionHashesParam)
  params: TimestampVersionHashesParam[];
}

export default RequestTimestampVersionHashesDto;
