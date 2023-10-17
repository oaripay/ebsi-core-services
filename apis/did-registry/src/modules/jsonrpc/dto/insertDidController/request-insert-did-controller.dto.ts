import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { InsertDidControllerParam } from "./insert-did-controller-param.dto.js";

export class RequestInsertDidControllerDto extends JsonRpcDto {
  @Equals("insertDidController")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertDidControllerParam)
  declare params: InsertDidControllerParam[];
}

export default RequestInsertDidControllerDto;
