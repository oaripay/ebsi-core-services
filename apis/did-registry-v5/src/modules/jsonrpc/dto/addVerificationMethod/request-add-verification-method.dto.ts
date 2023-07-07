import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { AddVerificationMethodParam } from "./add-verification-method-param.dto";

export class RequestAddVerificationMethodDto extends JsonRpcDto {
  @Equals("addVerificationMethod")
  method!: "addVerificationMethod";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => AddVerificationMethodParam)
  params!: AddVerificationMethodParam[];
}

export default RequestAddVerificationMethodDto;
