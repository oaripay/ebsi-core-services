import {
  IsArray,
  Equals,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { UpdateAdministratorParam } from "./update-administrator-param.dto";

export class RequestUpdateAdministratorDto extends JsonRpcDto {
  @Equals("updateAdministrator")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateAdministratorParam)
  params: UpdateAdministratorParam[];
}

export default RequestUpdateAdministratorDto;
