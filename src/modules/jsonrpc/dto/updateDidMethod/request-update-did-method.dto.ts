import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { UpdateDidMethodParam } from "./update-did-method-param.dto";

export class RequestUpdateDidMethodDto extends JsonRpcDto {
  @Equals("updateDidMethod")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateDidMethodParam)
  params: UpdateDidMethodParam[];
}

export default RequestUpdateDidMethodDto;
