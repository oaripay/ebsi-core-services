import { IsDid, PaginationQuery } from "@ebsiint-api/shared";

export class SubjectAccessesDto extends PaginationQuery {
  @IsDid()
  "subject"!: string;
}

export default SubjectAccessesDto;
