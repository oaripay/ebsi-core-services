import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { AddVerificationMethodParam } from "./add-verification-method-param.dto.js";

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
