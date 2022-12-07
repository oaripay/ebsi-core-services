import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { UpdateLedgerInfoByIdParam } from "./update-ledger-info-by-id-param.dto";

export class RequestUpdateLedgerInfoByIdDto extends JsonRpcDto {
  @Equals("updateLedgerInfoById")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateLedgerInfoByIdParam)
  params: UpdateLedgerInfoByIdParam[];
}

export default RequestUpdateLedgerInfoByIdDto;
