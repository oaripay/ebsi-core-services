import { PaginationQuery } from "@ebsiint-api/shared";
import { IsOptional, IsString } from "class-validator";

export class GetHashAlgorithmsDto extends PaginationQuery {
  @IsOptional()
  @IsString()
  iananame?: string;

  @IsOptional()
  @IsString()
  multihash?: string;

  @IsOptional()
  @IsString()
  oid?: string;

  @IsOptional()
  @IsString()
  "output-length"?: string;

  @IsOptional()
  @IsString()
  status?: "active" | "revoked" | "undefined";
}

export default GetHashAlgorithmsDto;
