import { IsHexadecimal, IsOptional, Length, Matches } from "class-validator";

import { GetIssuerParamsDto } from "./get-issuer.params.dto.js";

export class GetIssuerProxyParamsDto extends GetIssuerParamsDto {
  @Matches(/^0x/, { message: "proxyId must start with 0x" })
  @IsHexadecimal()
  @Length(66, 66)
  "proxyId": string;

  @IsOptional()
  "path"?: string;
}

export default GetIssuerProxyParamsDto;
