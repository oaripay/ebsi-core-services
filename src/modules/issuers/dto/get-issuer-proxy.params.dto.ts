import { IsOptional } from "class-validator";
import { GetIssuerParamsDto } from "./get-issuer.params.dto";

export class GetIssuerProxyParamsDto extends GetIssuerParamsDto {
  "proxyId": string;

  @IsOptional()
  "path"?: string;
}

export default GetIssuerProxyParamsDto;
