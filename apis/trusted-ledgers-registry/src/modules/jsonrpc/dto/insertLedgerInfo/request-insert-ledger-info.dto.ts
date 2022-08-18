import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { InsertLedgerInfoParam } from "./insert-ledger-info-param.dto";

export class RequestInsertLedgerInfoDto extends JsonRpcDto {
  @Equals("insertLedgerInfo")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertLedgerInfoParam)
  params: InsertLedgerInfoParam[];
}

export default RequestInsertLedgerInfoDto;
