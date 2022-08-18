import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { UpdateSmartContractNameParam } from "./update-smart-contract-name-param.dto";

export class RequestUpdateSmartContractNameDto extends JsonRpcDto {
  @Equals("updateSmartContractName")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateSmartContractNameParam)
  params: UpdateSmartContractNameParam[];
}

export default RequestUpdateSmartContractNameDto;
