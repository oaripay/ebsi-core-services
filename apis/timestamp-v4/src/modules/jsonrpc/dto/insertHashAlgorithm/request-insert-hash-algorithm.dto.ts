import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { InsertHashAlgorithmParam } from "./insert-hash-algorithm-param.dto";

export class RequestInsertHashAlgorithmDto extends JsonRpcDto {
  @Equals("insertHashAlgorithm")
  method!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertHashAlgorithmParam)
  params!: InsertHashAlgorithmParam[];
}

export default RequestInsertHashAlgorithmDto;
