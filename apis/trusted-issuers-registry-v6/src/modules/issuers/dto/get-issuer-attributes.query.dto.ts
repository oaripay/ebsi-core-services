import { PaginationQuery } from "@ebsiint-api/shared";
import { IsIn, IsOptional } from "class-validator";

import type { IssuerType } from "../../../../.graphclient/index.js";

export class GetIssuerAttributesQueryDto extends PaginationQuery {
  @IsOptional()
  @IsIn(["RootTAO", "TAO", "TI", "Revoked"])
  "issuer-type"?: IssuerType;
}

export default GetIssuerAttributesQueryDto;
