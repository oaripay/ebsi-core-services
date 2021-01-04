import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { UpdateAdministratorParam } from "./update-administrator-param.dto";
import { JsonRpcDto } from "../jsonrpc.dto";

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

export default { RequestUpdateAdministratorDto };
