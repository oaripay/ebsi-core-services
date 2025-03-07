import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  ValidateNested,
} from "class-validator";

import { JsonRpcDto } from "../jsonrpc.dto.ts";
import { AddIssuerProxyParam } from "./add-issuer-proxy-param.dto.ts";

export class RequestAddIssuerProxyDto extends JsonRpcDto {
  @Equals("addIssuerProxy")
  declare method: "addIssuerProxy";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => AddIssuerProxyParam)
  declare params: AddIssuerProxyParam[];
}

export default RequestAddIssuerProxyDto;
