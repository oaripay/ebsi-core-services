import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { InsertAppParam } from "./insert-app-param.dto";

export class RequestInsertAppDto extends JsonRpcDto {
  @Equals("insertApp")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertAppParam)
  params: InsertAppParam[];
}

export default RequestInsertAppDto;
