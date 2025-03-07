import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  ValidateNested,
} from "class-validator";

import { JsonRpcDto } from "../jsonrpc.dto.ts";
import { ExpireVerificationMethodParam } from "./expire-verification-method-param.dto.ts";

export class RequestExpireVerificationMethodDto extends JsonRpcDto {
  @Equals("expireVerificationMethod")
  declare method: "expireVerificationMethod";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => ExpireVerificationMethodParam)
  declare params: ExpireVerificationMethodParam[];
}

export default RequestExpireVerificationMethodDto;
