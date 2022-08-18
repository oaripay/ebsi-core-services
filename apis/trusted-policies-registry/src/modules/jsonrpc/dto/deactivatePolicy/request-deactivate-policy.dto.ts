import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { DeactivatePolicyParam } from "./deactivate-policy-param.dto";

export class RequestDeactivatePolicyDto extends JsonRpcDto {
  @Equals("deactivatePolicy")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => DeactivatePolicyParam)
  params: DeactivatePolicyParam[];
}

export default RequestDeactivatePolicyDto;
