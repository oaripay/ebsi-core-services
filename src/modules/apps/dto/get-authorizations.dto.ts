import { IsString, IsOptional, Length } from "class-validator";
import PaginationQuery from "../../../shared/dto/pagination-query";

export default class GetAuthorizationsDto extends PaginationQuery {
  @IsOptional()
  @IsString()
  @Length(66, 66)
  requesterApplicationId: string;
}
