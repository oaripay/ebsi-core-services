import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { AddPolicyConditionsParam } from "./add-policy-conditions-param.dto";

export class RequestAddPolicyConditionsDto extends JsonRpcDto {
  @Equals("addPolicyConditions")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => AddPolicyConditionsParam)
  params: AddPolicyConditionsParam[];
}

export default RequestAddPolicyConditionsDto;
