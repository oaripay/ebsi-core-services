import { IsHexadecimal, IsNumber, IsOptional, Matches } from "class-validator";
import { Type } from "class-transformer";
import { PaginationQuery } from "../../../shared/dto";

export class GetTimestampsQueryDto extends PaginationQuery {
  @IsOptional()
  @IsHexadecimal()
  @Matches(/^0x/)
  identifier?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  "version-id"?: number;
}

export default GetTimestampsQueryDto;
