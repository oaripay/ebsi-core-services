import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { DeletePolicyConditionParam } from "./delete-policy-condition-param.dto";

export class RequestDeletePolicyConditionDto extends JsonRpcDto {
  @Equals("deletePolicyCondition")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => DeletePolicyConditionParam)
  params: DeletePolicyConditionParam[];
}

export default RequestDeletePolicyConditionDto;
