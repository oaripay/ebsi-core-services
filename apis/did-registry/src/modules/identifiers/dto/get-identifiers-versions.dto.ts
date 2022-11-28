import { IsDateString, IsOptional } from "class-validator";
import { PaginationQuery } from "@ebsiint-api/shared";

export class GetIdentifiersVersionsDto extends PaginationQuery {
  @IsOptional()
  @IsDateString()
  "valid-at": string;
}

export default GetIdentifiersVersionsDto;
