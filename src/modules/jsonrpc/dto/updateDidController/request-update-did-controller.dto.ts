import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { UpdateDidControllerParam } from "./update-did-controller-param.dto";

export class RequestUpdateDidControllerDto extends JsonRpcDto {
  @Equals("updateDidController")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateDidControllerParam)
  params: UpdateDidControllerParam[];
}

export default RequestUpdateDidControllerDto;
