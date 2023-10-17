import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { InsertAuthorizationParam } from "./insert-authorization-param.dto.js";

export class RequestInsertAuthorizationDto extends JsonRpcDto {
  @Equals("insertAuthorization")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertAuthorizationParam)
  declare params: InsertAuthorizationParam[];
}

export default RequestInsertAuthorizationDto;
