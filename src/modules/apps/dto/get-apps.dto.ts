import { IsString, IsHexadecimal, IsOptional, Length } from "class-validator";
import PaginationQuery from "../../../shared/dto/pagination-query";

export default class GetAppsDto extends PaginationQuery {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsHexadecimal()
  @Length(66, 66)
  public_key_id: string;
}
