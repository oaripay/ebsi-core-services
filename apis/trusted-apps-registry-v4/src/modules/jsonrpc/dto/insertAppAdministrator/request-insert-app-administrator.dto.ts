import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { InsertAppAdministratorParam } from "./insert-app-administrator-param.dto";

export class RequestInsertAppAdministratorDto extends JsonRpcDto {
  @Equals("insertAppAdministrator")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertAppAdministratorParam)
  params: InsertAppAdministratorParam[];
}

export default RequestInsertAppAdministratorDto;
