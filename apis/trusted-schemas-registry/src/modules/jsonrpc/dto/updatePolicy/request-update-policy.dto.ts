import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { UpdatePolicyParam } from "./update-policy-param.dto.js";

export class RequestUpdatePolicyDto extends JsonRpcDto {
  @Equals("updatePolicy")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdatePolicyParam)
  declare params: UpdatePolicyParam[];
}

export default { RequestUpdatePolicyDto };
