import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { ExpireVerificationMethodParam } from "./expire-verification-method-param.dto";

export class RequestExpireVerificationMethodDto extends JsonRpcDto {
  @Equals("expireVerificationMethod")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => ExpireVerificationMethodParam)
  params: ExpireVerificationMethodParam[];
}

export default RequestExpireVerificationMethodDto;
