import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  ValidateNested,
} from "class-validator";

import { JsonRpcDto } from "../jsonrpc.dto.ts";
import { AddControllerParam } from "./add-controller-param.dto.ts";

export class RequestAddControllerDto extends JsonRpcDto {
  @Equals("addController")
  declare method: "addController";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => AddControllerParam)
  declare params: AddControllerParam[];
}

export default RequestAddControllerDto;
