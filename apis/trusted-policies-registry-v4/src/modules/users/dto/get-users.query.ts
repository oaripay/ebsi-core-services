import { IsOptional, IsString } from "class-validator";
import { PaginationQuery } from "@ebsiint-api/shared";

export class GetUsersQuery extends PaginationQuery {
  @IsOptional()
  @IsString()
  "attribute": string;
}

export default GetUsersQuery;
