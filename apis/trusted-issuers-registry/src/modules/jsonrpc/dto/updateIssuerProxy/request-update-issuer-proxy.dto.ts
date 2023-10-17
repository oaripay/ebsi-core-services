import {
  IsArray,
  Equals,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { UpdateIssuerProxyParam } from "./update-issuer-proxy-param.dto.js";

export class RequestUpdateIssuerProxyDto extends JsonRpcDto {
  @Equals("updateIssuerProxy")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateIssuerProxyParam)
  declare params: UpdateIssuerProxyParam[];
}

export default RequestUpdateIssuerProxyDto;
