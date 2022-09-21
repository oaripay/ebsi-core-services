import {
  IsArray,
  Equals,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { UpdateIssuerProxyParam } from "./update-issuer-proxy-param.dto";

export class RequestUpdateIssuerProxyDto extends JsonRpcDto {
  @Equals("updateIssuerProxy")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateIssuerProxyParam)
  params: UpdateIssuerProxyParam[];
}

export default RequestUpdateIssuerProxyDto;
