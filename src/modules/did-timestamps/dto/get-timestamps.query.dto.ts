import { IsNumber, IsOptional } from "class-validator";
import { Type } from "class-transformer";
import { IsDid } from "../../../shared/validators";
import { PaginationQuery } from "../../../shared/dto";

export class GetTimestampsQueryDto extends PaginationQuery {
  @IsOptional()
  @IsDid()
  identifier?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  "version-id"?: number;
}

export default GetTimestampsQueryDto;
