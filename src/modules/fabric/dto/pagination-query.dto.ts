import { IsNumber, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class PaginationQueryDto {
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

export default PaginationQueryDto;
