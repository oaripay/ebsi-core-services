import { IsEthereumAddress, IsOptional } from "class-validator";
import { PaginationQuery } from "@ebsiint-api/shared";

export class GetIdentifiersDto extends PaginationQuery {
  @IsOptional()
  @IsEthereumAddress()
  "controller"?: string;
}

export default GetIdentifiersDto;
