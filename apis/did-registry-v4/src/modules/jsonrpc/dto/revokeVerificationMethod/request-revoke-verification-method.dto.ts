import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { RevokeVerificationMethodParam } from "./revoke-verification-method-param.dto";

export class RequestRevokeVerificationMethodDto extends JsonRpcDto {
  @Equals("revokeVerificationMethod")
  method!: "revokeVerificationMethod";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => RevokeVerificationMethodParam)
  params!: RevokeVerificationMethodParam[];
}

export default RequestRevokeVerificationMethodDto;
