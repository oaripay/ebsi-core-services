import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { InsertHashAlgorithmParam } from "./insert-hash-algorithm-param.dto.js";

export class RequestInsertHashAlgorithmDto extends JsonRpcDto {
  @Equals("insertHashAlgorithm")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertHashAlgorithmParam)
  declare params: InsertHashAlgorithmParam[];
}

export default RequestInsertHashAlgorithmDto;
