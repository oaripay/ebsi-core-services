import "reflect-metadata";
import { IsNumber, Min, Max, IsString } from "class-validator";
import { Type } from "class-transformer";

export class StringPaginationQuery {
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  "page[size]" = 10;

  @IsString()
  "page[after]" = "";
}

export default StringPaginationQuery;
