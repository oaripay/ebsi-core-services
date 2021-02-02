import {
  IsHexadecimal,
  IsOptional,
  Length,
  IsEthereumAddress,
} from "class-validator";
import PaginationQuery from "../../../shared/dto/pagination-query";

export default class GetRecordsDto extends PaginationQuery {
  @IsOptional()
  @IsHexadecimal()
  @Length(66, 66)
  "first-version": string;

  @IsOptional()
  @IsEthereumAddress()
  owner: string;
}
