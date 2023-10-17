import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { AddControllerParam } from "./add-controller-param.dto.js";

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
