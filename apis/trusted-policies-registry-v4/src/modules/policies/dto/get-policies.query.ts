import { PaginationQuery } from "@ebsiint-api/shared";
import { IsIn, IsOptional } from "class-validator";

export class GetPoliciesQuery extends PaginationQuery {
  @IsIn(["true", "false"])
  @IsOptional()
  "status": string;
}

export default GetPoliciesQuery;
