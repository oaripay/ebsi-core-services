import {
  IsHexadecimal,
  IsOptional,
  IsString,
  Length,
  Matches,
} from "class-validator";
import { PaginationQuery } from "@ebsiint-api/shared";

export default class GetAppsDto extends PaginationQuery {
  @IsOptional()
  @IsString()
  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  @Length(66, 66)
  public_key_id?: string;
}
