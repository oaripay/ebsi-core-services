import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { UpdateAuthorizationParam } from "./update-authorization-param.dto.js";

export class RequestUpdateAuthorizationDto extends JsonRpcDto {
  @Equals("updateAuthorization")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateAuthorizationParam)
  declare params: UpdateAuthorizationParam[];
}

export default RequestUpdateAuthorizationDto;
