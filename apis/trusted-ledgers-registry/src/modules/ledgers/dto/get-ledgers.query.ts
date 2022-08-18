import { IsOptional, IsString } from "class-validator";
import { PaginationQuery } from "../../../shared/dto";

export class GetLedgersQuery extends PaginationQuery {
  @IsOptional()
  @IsString()
  "name": string;
}

export default GetLedgersQuery;
