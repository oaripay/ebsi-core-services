import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { RevokeControllerParam } from "./revoke-controller-param.dto.js";

export class RequestRevokeControllerDto extends JsonRpcDto {
  @Equals("revokeController")
  declare method: "revokeController";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => RevokeControllerParam)
  declare params: RevokeControllerParam[];
}

export default RequestRevokeControllerDto;
