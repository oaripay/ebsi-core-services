import { Type } from "class-transformer";
import { IsBoolean, ValidateNested } from "class-validator";
import { CommitActionPayloadDto } from "./commit-action-payload.dto";

export class CommitActionDto {
  @IsBoolean()
  init: boolean;

  @ValidateNested()
  @Type(() => CommitActionPayloadDto)
  payload: CommitActionPayloadDto;
}

export default { CommitActionDto };
