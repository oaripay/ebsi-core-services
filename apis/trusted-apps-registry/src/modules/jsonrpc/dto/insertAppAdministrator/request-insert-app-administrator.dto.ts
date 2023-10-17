import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { InsertAppAdministratorParam } from "./insert-app-administrator-param.dto.js";

export class RequestInsertAppAdministratorDto extends JsonRpcDto {
  @Equals("insertAppAdministrator")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertAppAdministratorParam)
  declare params: InsertAppAdministratorParam[];
}

export default RequestInsertAppAdministratorDto;
