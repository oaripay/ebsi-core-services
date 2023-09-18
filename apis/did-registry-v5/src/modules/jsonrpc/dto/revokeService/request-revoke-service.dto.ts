import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { RevokeServiceParam } from "./revoke-service-param.dto";

export class RequestRevokeServiceDto extends JsonRpcDto {
  @Equals("revokeService")
  method!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => RevokeServiceParam)
  params!: RevokeServiceParam[];
}

export default { RequestRevokeServiceDto };
