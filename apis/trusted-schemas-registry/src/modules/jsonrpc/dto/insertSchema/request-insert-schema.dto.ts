import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { InsertSchemaParam } from "./insert-schema-param.dto";

export class RequestInsertSchemaDto extends JsonRpcDto {
  @Equals("insertSchema")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertSchemaParam)
  params: InsertSchemaParam[];
}

export default RequestInsertSchemaDto;
