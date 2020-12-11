import { IsNumber, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export default class PaginationQuery {
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  "page[size]" = 10;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  "page[after]" = 1;
}
