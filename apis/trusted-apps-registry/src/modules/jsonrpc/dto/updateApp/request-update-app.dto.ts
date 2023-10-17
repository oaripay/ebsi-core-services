import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { UpdateAppParam } from "./update-app-param.dto.js";

export class RequestUpdateAppDto extends JsonRpcDto {
  @Equals("updateApp")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateAppParam)
  declare params: UpdateAppParam[];
}

export default RequestUpdateAppDto;
