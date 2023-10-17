import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { RevokeVerificationMethodParam } from "./revoke-verification-method-param.dto.js";

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

export default RequestRevokeVerificationMethodDto;
