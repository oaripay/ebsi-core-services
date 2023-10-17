import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { DeletePolicyConditionParam } from "./delete-policy-condition-param.dto.js";

export class RequestDeletePolicyConditionDto extends JsonRpcDto {
  @Equals("deletePolicyCondition")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => DeletePolicyConditionParam)
  declare params: DeletePolicyConditionParam[];
}

export default RequestDeletePolicyConditionDto;
