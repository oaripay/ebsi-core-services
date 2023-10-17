import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { UpdateDidControllerParam } from "./update-did-controller-param.dto.js";

export class RequestUpdateDidControllerDto extends JsonRpcDto {
  @Equals("updateDidController")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateDidControllerParam)
  declare params: UpdateDidControllerParam[];
}

export default RequestUpdateDidControllerDto;
