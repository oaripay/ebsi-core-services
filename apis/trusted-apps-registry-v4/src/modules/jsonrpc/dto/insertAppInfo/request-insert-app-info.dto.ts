import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { InsertAppInfoParam } from "./insert-app-info-param.dto.js";

export class RequestInsertAppInfoDto extends JsonRpcDto {
  @Equals("insertAppInfo")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertAppInfoParam)
  declare params: InsertAppInfoParam[];
}

export default RequestInsertAppInfoDto;
