import { IsOptional } from "class-validator";
import { GetIssuerParamsDto } from "./get-issuer.params.dto.js";

export class GetIssuerProxyParamsDto extends GetIssuerParamsDto {
  "proxyId": string;

  @IsOptional()
  "path"?: string;
}

export default GetIssuerProxyParamsDto;
