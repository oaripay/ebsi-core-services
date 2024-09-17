import { PaginationQuery } from "@ebsiint-api/shared";
import { IsHexadecimal, IsOptional } from "class-validator";

export class GetIssuersQueryDto extends PaginationQuery {
  @IsOptional()
  @IsHexadecimal()
  "attribute-id"?: string;

  @IsOptional()
  @IsHexadecimal()
  "proxy-id"?: string;
}

export default GetIssuersQueryDto;
