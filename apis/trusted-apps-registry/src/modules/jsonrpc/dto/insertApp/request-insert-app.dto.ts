import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { InsertAppParam } from "./insert-app-param.dto.js";

export class RequestInsertAppDto extends JsonRpcDto {
  @Equals("insertApp")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertAppParam)
  declare params: InsertAppParam[];
}

export default RequestInsertAppDto;
