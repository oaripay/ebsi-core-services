import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  ValidateNested,
} from "class-validator";

import { JsonRpcDto } from "../jsonrpc.dto.ts";
import { AddVerificationMethodParam } from "./add-verification-method-param.dto.ts";

export class RequestAddVerificationMethodDto extends JsonRpcDto {
  @Equals("addVerificationMethod")
  declare method: "addVerificationMethod";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => AddVerificationMethodParam)
  declare params: AddVerificationMethodParam[];
}

export default RequestAddVerificationMethodDto;
