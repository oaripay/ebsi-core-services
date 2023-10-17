import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { RevokeServiceParam } from "./revoke-service-param.dto.js";

export class RequestRevokeServiceDto extends JsonRpcDto {
  @Equals("revokeService")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => RevokeServiceParam)
  declare params: RevokeServiceParam[];
}

export default { RequestRevokeServiceDto };
