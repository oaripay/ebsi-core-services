import { IsIn, IsOptional } from "class-validator";
import { PaginationQuery } from "@ebsiint-api/shared";

export class GetPoliciesQuery extends PaginationQuery {
  @IsOptional()
  @IsIn(["true", "false"])
  "status": string;
}

export default GetPoliciesQuery;
