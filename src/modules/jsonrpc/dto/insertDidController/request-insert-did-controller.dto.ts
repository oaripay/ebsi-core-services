import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { InsertDidControllerParam } from "./insert-did-controller-param.dto";

export class RequestInsertDidControllerDto extends JsonRpcDto {
  @Equals("insertDidController")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertDidControllerParam)
  params: InsertDidControllerParam[];
}

export default RequestInsertDidControllerDto;
