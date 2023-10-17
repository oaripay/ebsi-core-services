import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { DeleteAppAdministratorParam } from "./delete-app-administrator-param.dto.js";

export class RequestDeleteAppAdministratorDto extends JsonRpcDto {
  @Equals("deleteAppAdministrator")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => DeleteAppAdministratorParam)
  declare params: DeleteAppAdministratorParam[];
}

export default RequestDeleteAppAdministratorDto;
