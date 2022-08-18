import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { ActivatePolicyParam } from "./activate-policy-param.dto";

export class RequestActivatePolicyDto extends JsonRpcDto {
  @Equals("activatePolicy")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => ActivatePolicyParam)
  params: ActivatePolicyParam[];
}

export default RequestActivatePolicyDto;
