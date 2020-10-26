import { IsNumber, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export default class QueryPagination {
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  "page[size]" = 10;

  // /issuers endpoints are currently 0-based
  // once they are 1-based, we can use src/shared/dto/pagination-query.ts instead of this file
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  "page[after]" = 0;
}
