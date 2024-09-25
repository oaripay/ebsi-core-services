import { IsIn, IsOptional, IsString } from "class-validator";
import { IsDid, PaginationQuery } from "@ebsiint-api/shared";

export class SubjectAccessesDto extends PaginationQuery {
  @IsDid()
  "subject"!: string;

  @IsOptional()
  @IsIn(["delegate", "write", "creator"])
  permission?: "delegate" | "write" | "creator";

  @IsOptional()
  @IsString()
  "granted-by"?: string;
}

export default SubjectAccessesDto;
