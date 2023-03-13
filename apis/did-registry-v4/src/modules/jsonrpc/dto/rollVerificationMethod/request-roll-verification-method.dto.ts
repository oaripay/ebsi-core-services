import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { RollVerificationMethodParam } from "./roll-verification-method-param.dto";

export class RequestRollVerificationMethodDto extends JsonRpcDto {
  @Equals("rollVerificationMethod")
  method!: "rollVerificationMethod";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => RollVerificationMethodParam)
  params!: RollVerificationMethodParam[];
}

export default RequestRollVerificationMethodDto;
