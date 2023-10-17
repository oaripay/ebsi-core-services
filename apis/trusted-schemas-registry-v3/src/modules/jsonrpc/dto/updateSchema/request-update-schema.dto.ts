import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { UpdateSchemaParam } from "./update-schema-param.dto.js";

export class RequestUpdateSchemaDto extends JsonRpcDto {
  @Equals("updateSchema")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateSchemaParam)
  declare params: UpdateSchemaParam[];
}

export default RequestUpdateSchemaDto;
