import { IsIn, IsOptional, IsString } from "class-validator";
import { PaginationQuery } from "@ebsiint-api/shared";

export class GetDocumentsDto extends PaginationQuery {
  @IsOptional()
  @IsString()
  creator?: string;

  @IsOptional()
  @IsIn(["block", "external"])
  source?: "block" | "external";
}

export default GetDocumentsDto;
