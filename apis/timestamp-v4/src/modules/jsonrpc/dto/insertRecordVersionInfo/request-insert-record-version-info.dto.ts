import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { InsertRecordVersionInfoParam } from "./insert-record-version-info-param.dto";

export class RequestInsertRecordVersionInfoDto extends JsonRpcDto {
  @Equals("insertRecordVersionInfo")
  method!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @ValidateNested({ each: true })
  @Type(() => InsertRecordVersionInfoParam)
  params!: InsertRecordVersionInfoParam[];
}

export default RequestInsertRecordVersionInfoDto;
