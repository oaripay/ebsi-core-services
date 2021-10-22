import { Type } from "class-transformer";
import { IsBase64, ValidateNested } from "class-validator";
import { CommitActionPayloadHeaderDto } from "./commit-action-payload-header.dto";

export class CommitActionPayloadDto {
  @ValidateNested()
  @Type(() => CommitActionPayloadHeaderDto)
  header: CommitActionPayloadHeaderDto;

  @IsBase64()
  data: string;
}

export default { CommitActionPayloadDto };
