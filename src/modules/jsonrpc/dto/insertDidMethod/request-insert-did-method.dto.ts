import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { InsertDidMethodParam } from "./insert-did-method-param.dto";

export class RequestInsertDidMethodDto extends JsonRpcDto {
  @Equals("insertDidMethod")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertDidMethodParam)
  params: InsertDidMethodParam[];
}

export default RequestInsertDidMethodDto;
