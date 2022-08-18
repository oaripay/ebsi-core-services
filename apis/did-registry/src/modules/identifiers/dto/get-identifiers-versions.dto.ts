import { IsDateString, IsOptional } from "class-validator";
import { PaginationQuery } from "../../../shared/dto/pagination-query";

export class GetIdentifiersVersionsDto extends PaginationQuery {
  @IsOptional()
  @IsDateString()
  "valid-at": string;
}

export default GetIdentifiersVersionsDto;
