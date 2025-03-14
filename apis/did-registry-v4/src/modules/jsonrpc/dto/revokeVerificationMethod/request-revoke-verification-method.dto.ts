import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  ValidateNested,
} from "class-validator";

import { JsonRpcDto } from "../jsonrpc.dto.ts";
import { RevokeVerificationMethodParam } from "./revoke-verification-method-param.dto.ts";

export class RequestRevokeVerificationMethodDto extends JsonRpcDto {
  @Equals("revokeVerificationMethod")
  declare method: "revokeVerificationMethod";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => RevokeVerificationMethodParam)
  declare params: RevokeVerificationMethodParam[];
}
