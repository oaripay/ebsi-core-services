import { IsDid, PaginationQuery } from "@ebsiint-api/shared";
import { IsIn, IsOptional, IsString } from "class-validator";

export class SubjectAccessesDto extends PaginationQuery {
  @IsDid()
  "subject"!: string;

  @IsOptional()
  @IsIn(["delegate", "write", "creator"])
  permission?: "creator" | "delegate" | "write";

  @IsOptional()
  @IsString()
  "granted-by"?: string;
}

export default SubjectAccessesDto;
