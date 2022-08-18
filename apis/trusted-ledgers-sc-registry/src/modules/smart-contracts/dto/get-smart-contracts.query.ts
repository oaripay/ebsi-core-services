import { IsOptional, IsString } from "class-validator";
import { PaginationQuery } from "../../../shared/dto";

export class GetSmartContractsQuery extends PaginationQuery {
  @IsOptional()
  @IsString()
  "name": string;
}

export default GetSmartContractsQuery;
