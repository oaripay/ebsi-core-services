import { PaginationQuery } from "@ebsiint-api/shared";
import { IsIn, IsNumberString, IsOptional, IsString } from "class-validator";

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
  @IsNumberString({ no_symbols: true })
  "output-length"?: string;

  @IsOptional()
  @IsIn(["active", "revoked", "undefined"])
  status?: "active" | "revoked" | "undefined";
}

export default GetHashAlgorithmsDto;
