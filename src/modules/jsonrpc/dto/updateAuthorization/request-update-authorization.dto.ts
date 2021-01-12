import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { UpdateAuthorizationParam } from "./update-authorization-param.dto";

export class RequestUpdateAuthorizationDto extends JsonRpcDto {
  @Equals("updateAuthorization")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateAuthorizationParam)
  params: UpdateAuthorizationParam[];
}

export default RequestUpdateAuthorizationDto;
