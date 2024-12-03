import "reflect-metadata";
import { Type } from "class-transformer";
import { IsNumber, IsString, Max, Min } from "class-validator";

export class StringPaginationQuery {
  @IsString()
  "page[after]" = "";

  @IsNumber()
  @Max(50)
  @Min(1)
  @Type(() => Number)
  "page[size]" = 10;
}

export default StringPaginationQuery;
