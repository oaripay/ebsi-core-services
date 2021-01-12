import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { DeleteAppAdministratorParam } from "./delete-app-administrator-param.dto";

export class RequestDeleteAppAdministratorDto extends JsonRpcDto {
  @Equals("deleteAppAdministrator")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => DeleteAppAdministratorParam)
  params: DeleteAppAdministratorParam[];
}

export default RequestDeleteAppAdministratorDto;
