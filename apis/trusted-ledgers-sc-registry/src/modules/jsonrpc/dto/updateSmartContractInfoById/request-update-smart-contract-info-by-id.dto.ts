import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { UpdateSmartContractInfoByIdParam } from "./update-smart-contract-info-by-id-param.dto";

export class RequestUpdateSmartContractInfoByIdDto extends JsonRpcDto {
  @Equals("updateSmartContractInfoById")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateSmartContractInfoByIdParam)
  params: UpdateSmartContractInfoByIdParam[];
}

export default RequestUpdateSmartContractInfoByIdDto;
