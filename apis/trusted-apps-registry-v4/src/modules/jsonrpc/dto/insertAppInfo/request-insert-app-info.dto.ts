import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { InsertAppInfoParam } from "./insert-app-info-param.dto";

export class RequestInsertAppInfoDto extends JsonRpcDto {
  @Equals("insertAppInfo")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertAppInfoParam)
  params: InsertAppInfoParam[];
}

export default RequestInsertAppInfoDto;
