import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  ValidateNested,
} from "class-validator";

import { JsonRpcDto } from "../jsonrpc.dto.ts";
import { RevokeControllerParam } from "./revoke-controller-param.dto.ts";

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
