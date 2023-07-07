import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { AddControllerParam } from "./add-controller-param.dto";

export class RequestAddControllerDto extends JsonRpcDto {
  @Equals("addController")
  method!: "addController";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => AddControllerParam)
  params!: AddControllerParam[];
}

export default RequestAddControllerDto;
