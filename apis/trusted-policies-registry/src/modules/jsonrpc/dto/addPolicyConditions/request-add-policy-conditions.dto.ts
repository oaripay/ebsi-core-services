import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { AddPolicyConditionsParam } from "./add-policy-conditions-param.dto.js";

export class RequestAddPolicyConditionsDto extends JsonRpcDto {
  @Equals("addPolicyConditions")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => AddPolicyConditionsParam)
  declare params: AddPolicyConditionsParam[];
}

export default RequestAddPolicyConditionsDto;
