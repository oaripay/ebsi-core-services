import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { DeactivatePolicyParam } from "./deactivate-policy-param.dto.js";

export class RequestDeactivatePolicyDto extends JsonRpcDto {
  @Equals("deactivatePolicy")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => DeactivatePolicyParam)
  declare params: DeactivatePolicyParam[];
}

export default RequestDeactivatePolicyDto;
