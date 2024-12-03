import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  ValidateNested,
} from "class-validator";

import { JsonRpcDto } from "../jsonrpc.dto.js";
import { RollVerificationMethodParam } from "./roll-verification-method-param.dto.js";

export class RequestRollVerificationMethodDto extends JsonRpcDto {
  @Equals("rollVerificationMethod")
  declare method: "rollVerificationMethod";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => RollVerificationMethodParam)
  declare params: RollVerificationMethodParam[];
}

export default RequestRollVerificationMethodDto;
