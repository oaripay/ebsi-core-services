import {
  IsArray,
  Equals,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { AddIssuerProxyParam } from "./add-issuer-proxy-param.dto.js";

export class RequestAddIssuerProxyDto extends JsonRpcDto {
  @Equals("addIssuerProxy")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => AddIssuerProxyParam)
  declare params: AddIssuerProxyParam[];
}

export default RequestAddIssuerProxyDto;
