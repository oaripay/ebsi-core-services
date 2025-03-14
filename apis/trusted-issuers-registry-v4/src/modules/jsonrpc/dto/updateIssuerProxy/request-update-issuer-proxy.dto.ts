import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  ValidateNested,
} from "class-validator";

import { JsonRpcDto } from "../jsonrpc.dto.ts";
import { UpdateIssuerProxyParam } from "./update-issuer-proxy-param.dto.ts";

export class RequestUpdateIssuerProxyDto extends JsonRpcDto {
  @Equals("updateIssuerProxy")
  declare method: "updateIssuerProxy";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateIssuerProxyParam)
  declare params: UpdateIssuerProxyParam[];
}
