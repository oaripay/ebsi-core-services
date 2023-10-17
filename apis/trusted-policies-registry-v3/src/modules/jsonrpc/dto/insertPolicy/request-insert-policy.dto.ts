import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { InsertPolicyParam } from "./insert-policy-param.dto.js";

export class RequestInsertPolicyDto extends JsonRpcDto {
  @Equals("insertPolicy")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertPolicyParam)
  declare params: InsertPolicyParam[];
}

export default RequestInsertPolicyDto;
