import {
  IsArray,
  Equals,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { InsertPolicyParam } from "./insert-policy-param.dto";

export class RequestInsertPolicyDto extends JsonRpcDto {
  @Equals("insertPolicy")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertPolicyParam)
  params: InsertPolicyParam[];
}

export default RequestInsertPolicyDto;
