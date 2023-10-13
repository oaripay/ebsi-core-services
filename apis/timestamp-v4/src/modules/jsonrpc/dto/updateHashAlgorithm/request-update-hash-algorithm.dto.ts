import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { UpdateHashAlgorithmParam } from "./update-hash-algorithm-param.dto";

export class RequestUpdateHashAlgorithmDto extends JsonRpcDto {
  @Equals("updateHashAlgorithm")
  method!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateHashAlgorithmParam)
  params!: UpdateHashAlgorithmParam[];
}

export default RequestUpdateHashAlgorithmDto;
