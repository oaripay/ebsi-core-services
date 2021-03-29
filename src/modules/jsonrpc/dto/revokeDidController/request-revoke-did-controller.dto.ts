import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { RevokeDidControllerParam } from "./revoke-did-controller-param.dto";

export class RequestRevokeDidControllerDto extends JsonRpcDto {
  @Equals("revokeDidController")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => RevokeDidControllerParam)
  params: RevokeDidControllerParam[];
}

export default RequestRevokeDidControllerDto;
