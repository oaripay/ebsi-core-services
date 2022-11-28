import { IsString, IsOptional } from "class-validator";
import { PaginationQuery } from "@ebsiint-api/shared";

export default class GetAuthorizationsDto extends PaginationQuery {
  @IsOptional()
  @IsString()
  requesterApplicationName: string;
}
