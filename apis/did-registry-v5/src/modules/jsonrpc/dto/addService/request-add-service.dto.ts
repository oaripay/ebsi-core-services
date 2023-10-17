import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { AddServiceParam } from "./add-service-param.dto.js";

export class RequestAddServiceDto extends JsonRpcDto {
  @Equals("addService")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => AddServiceParam)
  declare params: AddServiceParam[];
}

export default { RequestAddServiceDto };
