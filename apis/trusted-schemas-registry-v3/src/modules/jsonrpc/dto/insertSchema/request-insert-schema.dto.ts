import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { InsertSchemaParam } from "./insert-schema-param.dto.js";

export class RequestInsertSchemaDto extends JsonRpcDto {
  @Equals("insertSchema")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertSchemaParam)
  declare params: InsertSchemaParam[];
}

export default RequestInsertSchemaDto;
