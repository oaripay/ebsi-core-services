import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { UpdateLedgerNameParam } from "./update-ledger-name-param.dto";

export class RequestUpdateLedgerNameDto extends JsonRpcDto {
  @Equals("updateLedgerName")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateLedgerNameParam)
  params: UpdateLedgerNameParam[];
}

export default RequestUpdateLedgerNameDto;
