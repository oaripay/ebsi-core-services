import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { UpdateLedgerInfoByNameParam } from "./update-ledger-info-by-name-param.dto";

export class RequestUpdateLedgerInfoByNameDto extends JsonRpcDto {
  @Equals("updateLedgerInfoByName")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateLedgerInfoByNameParam)
  params: UpdateLedgerInfoByNameParam[];
}

export default RequestUpdateLedgerInfoByNameDto;
