import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { AddServiceParam } from "./add-service-param.dto";

export class RequestAddServiceDto extends JsonRpcDto {
  @Equals("addService")
  method!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => AddServiceParam)
  params!: AddServiceParam[];
}

export default { RequestAddServiceDto };
