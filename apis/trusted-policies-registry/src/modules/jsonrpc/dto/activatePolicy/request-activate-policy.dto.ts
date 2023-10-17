import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { ActivatePolicyParam } from "./activate-policy-param.dto.js";

export class RequestActivatePolicyDto extends JsonRpcDto {
  @Equals("activatePolicy")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => ActivatePolicyParam)
  declare params: ActivatePolicyParam[];
}

export default RequestActivatePolicyDto;
