import { IsNumber, IsString, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class PaginationQueryTransactionsDto {
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  "page[size]" = 10;

  @IsString()
  @Type(() => String)
  "page[after]" = "";
}

export default PaginationQueryTransactionsDto;
