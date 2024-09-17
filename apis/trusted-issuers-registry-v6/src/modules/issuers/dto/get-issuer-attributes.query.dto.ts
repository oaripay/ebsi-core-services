import { PaginationQuery } from "@ebsiint-api/shared";
import { IsIn, IsOptional } from "class-validator";
// eslint-disable-next-line import/extensions, import/no-relative-packages
import type { IssuerType } from "../../../../.graphclient/index.js";

export class GetIssuerAttributesQueryDto extends PaginationQuery {
  @IsOptional()
  @IsIn(["Undefined", "RootTAO", "TAO", "TI", "Revoked"])
  "issuer-type"?: IssuerType;
}

export default GetIssuerAttributesQueryDto;
