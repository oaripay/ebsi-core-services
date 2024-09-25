import { PaginationQuery } from "@ebsiint-api/shared";
import { IsOptional, IsString } from "class-validator";

export class GetTimestampsDto extends PaginationQuery {
  @IsOptional()
  @IsString()
  creator?: string;

  @IsOptional()
  @IsString()
  "hash-algorithm-id"?: string;
}

export default GetTimestampsDto;
