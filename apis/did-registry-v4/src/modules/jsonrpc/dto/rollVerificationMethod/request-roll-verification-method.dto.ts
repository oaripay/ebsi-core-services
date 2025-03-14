import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  ValidateNested,
} from "class-validator";

import { JsonRpcDto } from "../jsonrpc.dto.ts";
import { RollVerificationMethodParam } from "./roll-verification-method-param.dto.ts";

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
