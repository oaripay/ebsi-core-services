import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { InsertAdministratorParam } from "./insert-administrator-param.dto";

export class RequestInsertAdministratorDto extends JsonRpcDto {
  @Equals("insertAdministrator")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertAdministratorParam)
  params: InsertAdministratorParam[];
}

export default RequestInsertAdministratorDto;
