import { IsString, IsOptional } from "class-validator";
import PaginationQuery from "../../../shared/dto/pagination-query";

export default class GetAuthorizationsDto extends PaginationQuery {
  @IsOptional()
  @IsString()
  requesterApplicationName: string;
}
