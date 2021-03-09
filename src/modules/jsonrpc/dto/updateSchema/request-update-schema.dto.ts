import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { UpdateSchemaParam } from "./update-schema-param.dto";

export class RequestUpdateSchemaDto extends JsonRpcDto {
  @Equals("updateSchema")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateSchemaParam)
  params: UpdateSchemaParam[];
}

export default RequestUpdateSchemaDto;
