import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { UpdatePolicyParam } from "./update-policy-param.dto";

export class RequestUpdatePolicyDto extends JsonRpcDto {
  @Equals("updatePolicy")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdatePolicyParam)
  params: UpdatePolicyParam[];
}

export default RequestUpdatePolicyDto;
