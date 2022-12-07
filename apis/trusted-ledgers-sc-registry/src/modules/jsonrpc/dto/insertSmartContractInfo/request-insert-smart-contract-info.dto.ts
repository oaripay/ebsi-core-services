import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { InsertSmartContractInfoParam } from "./insert-smart-contract-info-param.dto";

export class RequestInsertSmartContractInfoDto extends JsonRpcDto {
  @Equals("insertSmartContractInfo")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertSmartContractInfoParam)
  params: InsertSmartContractInfoParam[];
}

export default RequestInsertSmartContractInfoDto;
