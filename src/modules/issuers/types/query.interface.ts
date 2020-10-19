import { IsNumberString, IsOptional } from "class-validator";
import IsPageSize from "./IsPageSize";

export default class QueryPagination {
  @IsOptional()
  @IsNumberString()
  @IsPageSize()
  "page[size]"?: string;

  @IsOptional()
  @IsNumberString()
  "page[after]"?: string;
}
