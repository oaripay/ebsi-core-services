import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { InsertUserAttributesParam } from "./insert-user-attributes-param.dto";

export class RequestInsertUserAttributesDto extends JsonRpcDto {
  @Equals("insertUserAttributes")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertUserAttributesParam)
  params: InsertUserAttributesParam[];
}

export default RequestInsertUserAttributesDto;
