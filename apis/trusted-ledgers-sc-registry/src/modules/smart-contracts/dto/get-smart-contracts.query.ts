import { IsOptional, IsString } from "class-validator";
import { PaginationQuery } from "@ebsiint-api/shared";

export class GetSmartContractsQuery extends PaginationQuery {
  @IsOptional()
  @IsString()
  "name": string;
}

export default GetSmartContractsQuery;
