import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { InsertRecordVersionInfoParam } from "./insert-record-version-info-param.dto.js";

export class RequestInsertRecordVersionInfoDto extends JsonRpcDto {
  @Equals("insertRecordVersionInfo")
  declare method: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @ValidateNested({ each: true })
  @Type(() => InsertRecordVersionInfoParam)
  declare params: InsertRecordVersionInfoParam[];
}

export default RequestInsertRecordVersionInfoDto;
