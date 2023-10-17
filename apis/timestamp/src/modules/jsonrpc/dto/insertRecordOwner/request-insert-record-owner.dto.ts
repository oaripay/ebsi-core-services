import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { InsertRecordOwnerParam } from "./insert-record-owner-param.dto.js";

export class RequestInsertRecordOwnerDto extends JsonRpcDto {
  @Equals("insertRecordOwner")
  declare method: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @ValidateNested({ each: true })
  @Type(() => InsertRecordOwnerParam)
  declare params: InsertRecordOwnerParam[];
}

export default RequestInsertRecordOwnerDto;
