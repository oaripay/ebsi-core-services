import { IsString, IsHexadecimal, IsOptional } from "class-validator";
import PaginationQuery from "../../../shared/dto/pagination-query";

export default class GetAppsDto extends PaginationQuery {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsHexadecimal()
  public_key_id: string;
}
