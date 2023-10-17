import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { RevokeDidControllerParam } from "./revoke-did-controller-param.dto.js";

export class RequestRevokeDidControllerDto extends JsonRpcDto {
  @Equals("revokeDidController")
  declare readonly method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => RevokeDidControllerParam)
  declare readonly params: RevokeDidControllerParam[];
}

export default RequestRevokeDidControllerDto;
