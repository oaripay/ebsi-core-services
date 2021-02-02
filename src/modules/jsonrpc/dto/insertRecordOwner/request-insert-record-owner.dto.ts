import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { InsertRecordOwnerParam } from "./insert-record-owner-param.dto";

export class RequestInsertRecordOwnerDto extends JsonRpcDto {
  @Equals("insertRecordOwner")
  method: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @ValidateNested({ each: true })
  @Type(() => InsertRecordOwnerParam)
  params: InsertRecordOwnerParam[];
}

export default RequestInsertRecordOwnerDto;
