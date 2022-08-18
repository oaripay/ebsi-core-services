import { IsEthereumAddress, IsOptional } from "class-validator";
import { PaginationQuery } from "../../../shared/dto/pagination-query";

export class GetIdentifiersDto extends PaginationQuery {
  @IsOptional()
  @IsEthereumAddress()
  "controller": string;
}

export default GetIdentifiersDto;
