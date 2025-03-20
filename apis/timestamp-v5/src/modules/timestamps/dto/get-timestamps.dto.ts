import { IsEthereumAddress, PaginationQuery } from "@ebsiint-api/shared";
import { IsNumberString, IsOptional } from "class-validator";

export class GetTimestampsDto extends PaginationQuery {
  @IsOptional()
  @IsEthereumAddress()
  creator?: string;

  @IsOptional()
  @IsNumberString({ no_symbols: true })
  "hash-algorithm-id"?: string;
}
