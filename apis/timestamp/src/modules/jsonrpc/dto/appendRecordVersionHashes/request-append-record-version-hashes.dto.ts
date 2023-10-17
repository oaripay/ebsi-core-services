import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { AppendRecordVersionHashesParam } from "./append-record-version-hashes-param.dto.js";

export class RequestAppendRecordVersionHashesDto extends JsonRpcDto {
  @Equals("appendRecordVersionHashes")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => AppendRecordVersionHashesParam)
  declare params: AppendRecordVersionHashesParam[];
}

export default RequestAppendRecordVersionHashesDto;
