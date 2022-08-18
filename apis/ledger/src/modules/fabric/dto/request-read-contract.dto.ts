import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "./jsonrpc.dto";
import { ReadContractParam } from "./read-contract-param.dto";

export class RequestReadContractDto extends JsonRpcDto {
  @Equals("readContract")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => ReadContractParam)
  params: ReadContractParam[];
}

export default RequestReadContractDto;
