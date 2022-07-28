import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { InsertAuthorizationParam } from "./insert-authorization-param.dto";

export class RequestInsertAuthorizationDto extends JsonRpcDto {
  @Equals("insertAuthorization")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertAuthorizationParam)
  params: InsertAuthorizationParam[];
}

export default RequestInsertAuthorizationDto;
