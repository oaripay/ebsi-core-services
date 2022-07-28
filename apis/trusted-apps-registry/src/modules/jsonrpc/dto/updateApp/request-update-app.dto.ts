import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { UpdateAppParam } from "./update-app-param.dto";

export class RequestUpdateAppDto extends JsonRpcDto {
  @Equals("updateApp")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateAppParam)
  params: UpdateAppParam[];
}

export default RequestUpdateAppDto;
