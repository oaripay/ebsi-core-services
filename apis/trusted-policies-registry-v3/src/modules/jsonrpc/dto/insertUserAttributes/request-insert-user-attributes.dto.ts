import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { InsertUserAttributesParam } from "./insert-user-attributes-param.dto.js";

export class RequestInsertUserAttributesDto extends JsonRpcDto {
  @Equals("insertUserAttributes")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertUserAttributesParam)
  declare params: InsertUserAttributesParam[];
}

export default RequestInsertUserAttributesDto;
