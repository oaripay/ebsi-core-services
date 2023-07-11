import {
  IsArray,
  Equals,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { AddIssuerProxyParam } from "./add-issuer-proxy-param.dto";

export class RequestAddIssuerProxyDto extends JsonRpcDto {
  @Equals("addIssuerProxy")
  method!: "addIssuerProxy";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => AddIssuerProxyParam)
  params!: AddIssuerProxyParam[];
}

export default RequestAddIssuerProxyDto;
