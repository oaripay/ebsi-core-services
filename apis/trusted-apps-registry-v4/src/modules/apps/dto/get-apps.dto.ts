import { IsHexadecimal, IsOptional, IsString, Length } from "class-validator";
import { PaginationQuery } from "@ebsiint-api/shared";

export default class GetAppsDto extends PaginationQuery {
  @IsOptional()
  @IsString()
  @IsHexadecimal()
  @Length(66, 66)
  public_key_id?: string;
}
