import {
  IsHexadecimal,
  IsOptional,
  Length,
  IsEthereumAddress,
  Matches,
} from "class-validator";
import { PaginationQuery } from "@ebsiint-api/shared";

export default class GetRecordsDto extends PaginationQuery {
  @IsOptional()
  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  @Length(66, 66)
  "first-version"?: string;

  @IsOptional()
  @IsEthereumAddress()
  owner?: string;
}
