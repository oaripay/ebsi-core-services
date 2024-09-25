import { IsIn, IsOptional, IsString } from "class-validator";
import { PaginationQuery } from "@ebsiint-api/shared";

export class GetDocumentAccessesDto extends PaginationQuery {
  @IsOptional()
  @IsIn(["delegate", "write", "creator"])
  permission?: "delegate" | "write" | "creator";

  @IsOptional()
  @IsString()
  "granted-by"?: string;

  @IsOptional()
  @IsString()
  subject?: string;
}

export default GetDocumentAccessesDto;
