import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { TimestampVersionHashesParam } from "./timestamp-version-hashes-param.dto.js";

export class RequestTimestampVersionHashesDto extends JsonRpcDto {
  @Equals("timestampVersionHashes")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => TimestampVersionHashesParam)
  declare params: TimestampVersionHashesParam[];
}

export default RequestTimestampVersionHashesDto;
