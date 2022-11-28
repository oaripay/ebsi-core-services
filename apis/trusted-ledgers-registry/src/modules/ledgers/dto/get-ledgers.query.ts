import { IsOptional, IsString } from "class-validator";
import { PaginationQuery } from "@ebsiint-api/shared";

export class GetLedgersQuery extends PaginationQuery {
  @IsOptional()
  @IsString()
  "name": string;
}

export default GetLedgersQuery;
