import { PaginationQuery } from "@ebsiint-api/shared";
import { IsOptional, IsString } from "class-validator";

export class GetUsersQuery extends PaginationQuery {
  @IsOptional()
  @IsString()
  "attribute": string;
}
