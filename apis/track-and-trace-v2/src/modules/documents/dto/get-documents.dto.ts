import { PaginationQuery } from "@ebsiint-api/shared";
import { IsIn, IsOptional, IsString } from "class-validator";

export class GetDocumentsDto extends PaginationQuery {
  @IsOptional()
  @IsString()
  creator?: string;

  @IsOptional()
  @IsIn(["block", "external"])
  source?: "block" | "external";
}

export default GetDocumentsDto;
