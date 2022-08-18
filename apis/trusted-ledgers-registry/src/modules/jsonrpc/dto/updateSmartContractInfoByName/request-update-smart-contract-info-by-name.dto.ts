import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { UpdateSmartContractInfoByNameParam } from "./update-smart-contract-info-by-name-param.dto";

export class RequestUpdateSmartContractInfoByNameDto extends JsonRpcDto {
  @Equals("updateSmartContractInfoByName")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateSmartContractInfoByNameParam)
  params: UpdateSmartContractInfoByNameParam[];
}

export default RequestUpdateSmartContractInfoByNameDto;
