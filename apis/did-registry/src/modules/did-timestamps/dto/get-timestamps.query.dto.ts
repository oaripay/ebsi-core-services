import { IsNumber, IsOptional } from "class-validator";
import { Type } from "class-transformer";
import { IsDidV1 } from "../../../shared/validators";
import { PaginationQuery } from "../../../shared/dto";

export class GetTimestampsQueryDto extends PaginationQuery {
  @IsOptional()
  @IsDidV1()
  identifier?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  "version-id"?: number;
}

export default GetTimestampsQueryDto;
