import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { RevokeControllerParam } from "./revoke-controller-param.dto";

export class RequestRevokeControllerDto extends JsonRpcDto {
  @Equals("revokeController")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => RevokeControllerParam)
  params: RevokeControllerParam[];
}

export default RequestRevokeControllerDto;
